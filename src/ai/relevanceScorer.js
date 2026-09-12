'use strict';

// Sistema de pontuacao que decide SE o bot deve responder a uma mensagem.
// O objetivo e evitar que o servidor vire um "chat com IA": o bot so fala
// quando faz sentido.
const { global: globalConfig, getGuildConfig } = require('../config/config');

const lastBotReplyByChannel = new Map(); // channelId -> timestamp
const recentMessageTimestampsByChannel = new Map(); // channelId -> [timestamps]

function registerBotReply(channelId) {
  lastBotReplyByChannel.set(channelId, Date.now());
}

function registerChannelActivity(channelId) {
  const list = recentMessageTimestampsByChannel.get(channelId) || [];
  list.push(Date.now());
  const cutoff = Date.now() - globalConfig.relevance.fastConversationWindowMs;
  const filtered = list.filter((t) => t >= cutoff);
  recentMessageTimestampsByChannel.set(channelId, filtered);
  return filtered.length;
}

function looksLikeQuestion(content) {
  const trimmed = content.trim();
  if (trimmed.endsWith('?')) return true;
  const questionStarters = /^(quem|que|qual|quais|como|quando|onde|por que|porque|pq|alguem sabe|alguem consegue|será que|sera que)\b/i;
  return questionStarters.test(trimmed);
}

function containsKeyword(content, keywords) {
  const lower = content.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Calcula a pontuacao de relevancia de uma mensagem e decide se o bot deve
 * responder. Retorna { score, shouldRespond, reasons }.
 */
function scoreMessage({ message, botUserId, isSpam }) {
  const guildId = message.guild.id;
  const channelId = message.channel.id;
  const cfg = getGuildConfig(guildId);
  const rc = globalConfig.relevance;

  const reasons = [];
  let score = 0;

  const mentionedBot = message.mentions.users.has(botUserId);
  if (mentionedBot) {
    score += rc.mentionScore;
    reasons.push(`mencao direta (+${rc.mentionScore})`);
  }

  const repliedToBot = message.reference && message.mentions.repliedUser && message.mentions.repliedUser.id === botUserId;
  if (repliedToBot) {
    score += rc.replyToBotScore;
    reasons.push(`resposta direta ao bot (+${rc.replyToBotScore})`);
  }

  if (!mentionedBot && looksLikeQuestion(message.content)) {
    score += rc.directQuestionScore;
    reasons.push(`parece uma pergunta (+${rc.directQuestionScore})`);
  }

  if (containsKeyword(message.content, cfg.keywords)) {
    score += rc.keywordScore;
    reasons.push(`palavra-chave configurada (+${rc.keywordScore})`);
  }

  // Assunto relacionado a um sistema do servidor (ticket, sugestao, xp, economia)
  const systemTopics = ['ticket', 'sugestao', 'sugestão', 'xp', 'rank', 'nivel', 'nível', 'economia', 'saldo', 'daily'];
  if (containsKeyword(message.content, systemTopics)) {
    score += rc.systemTopicScore;
    reasons.push(`assunto de sistema do servidor (+${rc.systemTopicScore})`);
  }

  const activityCount = registerChannelActivity(channelId);
  if (activityCount >= rc.fastConversationMessageCount) {
    score += rc.fastConversationPenalty;
    reasons.push(`conversa muito rapida (${rc.fastConversationPenalty})`);
  }

  if (cfg.silentChannels.includes(channelId)) {
    score += rc.silentChannelPenalty;
    reasons.push(`canal silencioso (${rc.silentChannelPenalty})`);
  }

  const lastReply = lastBotReplyByChannel.get(channelId) || 0;
  if (Date.now() - lastReply < rc.recentReplyCooldownMs && !mentionedBot && !repliedToBot) {
    score += rc.recentReplyPenalty;
    reasons.push(`bot respondeu recentemente (${rc.recentReplyPenalty})`);
  }

  if (isSpam) {
    score += rc.spamPenalty;
    reasons.push(`mensagem parece spam (${rc.spamPenalty})`);
  }

  const shouldRespond = score >= rc.threshold;
  return { score, shouldRespond, reasons };
}

module.exports = { scoreMessage, registerBotReply };
