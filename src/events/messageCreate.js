'use strict';

const logger = require('../utils/logger');
const { getGuildConfig } = require('../config/config');
const antiSpam = require('../moderation/antiSpam');
const relevanceScorer = require('../ai/relevanceScorer');
const contextManager = require('../ai/contextManager');
const aiManager = require('../ai/aiManager');
const memoryManager = require('../ai/memoryManager');
const xpManager = require('../xp/xpManager');
const usersDb = require('../database/users');
const { canManageMessages } = require('../moderation/permissions');
const { safe } = require('../errors/errorHandler');

async function handleModeration(message, cfg) {
  if (!cfg.moderationEnabled) return false;

  if (cfg.antiLinkEnabled && antiSpam.containsLink(message.content) && !canManageMessages(message.member)) {
    await message.delete().catch(() => {});
    const warn = await message.channel.send(`${message.author}, links nao sao permitidos neste canal.`);
    setTimeout(() => warn.delete().catch(() => {}), 5000);
    return true;
  }

  if (cfg.antiSpamEnabled && !canManageMessages(message.member) && antiSpam.isMessageSpam(message)) {
    await message.delete().catch(() => {});
    const warn = await message.channel.send(`${message.author}, por favor evite enviar mensagens repetidas rapidamente.`);
    setTimeout(() => warn.delete().catch(() => {}), 5000);
    return true;
  }

  return false;
}

function handleAfkMentions(message, cfg) {
  // Remove AFK do proprio autor ao voltar a falar
  const wasAfk = usersDb.getAfk(message.guild.id, message.author.id);
  if (wasAfk) {
    usersDb.removeAfk(message.guild.id, message.author.id);
    message.reply(`👋 Bem-vindo de volta, seu status AFK foi removido.`).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
  }

  // Avisa se algum usuario mencionado esta AFK
  for (const [, user] of message.mentions.users) {
    const afk = usersDb.getAfk(message.guild.id, user.id);
    if (afk) {
      message.reply(`💤 ${user.username} esta AFK: ${afk.reason}`).catch(() => {});
    }
  }
}

module.exports = {
  name: 'messageCreate',
  execute: safe(async function execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const cfg = getGuildConfig(message.guild.id);

    const wasModerated = await handleModeration(message, cfg);
    if (wasModerated) return;

    handleAfkMentions(message, cfg);

    // XP (respeitando cooldown interno para evitar farm por spam)
    if (!cfg.ignoredChannels.includes(message.channel.id)) {
      const xpResult = xpManager.registerMessage(message.guild.id, message.author.id);
      if (xpResult && xpResult.leveledUp) {
        message.channel.send(`🎉 ${message.author}, voce subiu para o nivel **${xpResult.row.level}**!`).catch(() => {});
      }
    }

    // Contexto (memoria temporaria) - guarda a mensagem para uso futuro da IA
    contextManager.addMessage(message.guild.id, message.channel.id, {
      authorId: message.author.id,
      authorName: message.member ? message.member.displayName : message.author.username,
      content: message.content,
      isBot: false
    });

    // Fatos memoraveis (item 1): analisa a mensagem com padroes conservadores
    // e so salva algo se bater um padrao claro de preferencia/fato pessoal -
    // nunca transforma qualquer mensagem em memoria permanente. Custo zero
    // de rede/IA (regex local).
    if (!cfg.ignoredChannels.includes(message.channel.id) && message.content) {
      memoryManager.extractAndRememberFact(message.guild.id, message.author.id, message.content);
    }

    if (cfg.ignoredChannels.includes(message.channel.id)) return;
    if (cfg.ignoredRoles.some((r) => message.member && message.member.roles.cache.has(r))) return;
    if (!message.content || message.content.trim().length === 0) return;

    // Decide se o bot deve responder usando o sistema de pontuacao de relevancia
    const isSpamLike = false; // ja tratado acima; aqui apenas para clareza do score
    const { score, shouldRespond, reasons } = relevanceScorer.scoreMessage({
      message,
      botUserId: client.user.id,
      isSpam: isSpamLike
    });

    logger.debug(`score=${score} responder=${shouldRespond} motivos=[${reasons.join(', ')}]`, 'relevance');

    if (!shouldRespond) return;

    await message.channel.sendTyping().catch(() => {});

    const reply = await aiManager.generate({
      guildId: message.guild.id,
      channelId: message.channel.id,
      userId: message.author.id,
      message: message.content,
      botDisplayName: message.guild.members.me.displayName
    });

    if (!reply) return; // IA indisponivel ou decidiu nao ter nada a acrescentar

    const sent = await message.reply({ content: reply, allowedMentions: { repliedUser: true } }).catch(async () => {
      return message.channel.send(reply).catch(() => null);
    });

    if (sent) {
      relevanceScorer.registerBotReply(message.channel.id);
      contextManager.addMessage(message.guild.id, message.channel.id, {
        authorId: client.user.id,
        authorName: message.guild.members.me.displayName,
        content: reply,
        isBot: true
      });
    }
  }, 'messageCreate')
};
