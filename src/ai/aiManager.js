'use strict';

// Camada abstrata de IA (item 5, 7 simplificado, 18, 19). O restante do bot
// NUNCA fala diretamente com um provider especifico; sempre passa por aqui.
//
// Cadeia de fallback por modo (AI_PROVIDER no .env):
//   "algorithm" (padrao, Discloud-safe): so o motor algoritmico, sem rede.
//   "ollama": Ollama -> Groq -> algoritmo (arquitetura-alvo do projeto).
//   "groq": Groq -> algoritmo (sem servidor de Ollama).
// Em qualquer modo, o motor algoritmico e sempre o ultimo degrau antes de
// simplesmente nao responder - o bot nunca trava esperando IA (item 18).
const logger = require('../utils/logger');
const algorithmProvider = require('./providers/algorithm');
const ollamaProvider = require('./providers/ollama');
const groqProvider = require('./providers/groq');
const localProvider = require('./providers/local');
const contextManager = require('./contextManager');
const { global: globalConfig, getGuildConfig } = require('../config/config');

const AI_PROVIDER = (process.env.AI_PROVIDER || 'algorithm').toLowerCase();

function getProviderChain() {
  if (AI_PROVIDER === 'ollama') return [ollamaProvider, groqProvider, algorithmProvider, localProvider];
  if (AI_PROVIDER === 'groq') return [groqProvider, algorithmProvider, localProvider];
  return [algorithmProvider, localProvider];
}

// Mensagens triviais (risadas, confirmacoes curtas, emojis isolados) nunca
// precisam de um provider pago/de rede - vao direto pro algoritmo, mesmo
// quando o modo configurado e "ollama"/"groq" (item 6: economia de tokens).
const TRIVIAL_PATTERN = /^[\s!.?]*(?:kk+|rs+|haha+|hehe+|sim|n[aã]o|ok(?:ay)?|blz|beleza|top|show|valeu|vlw|👍|🙏|😂|❤️|😅)[\s!.?]*$/i;

function isTrivialMessage(message) {
  return TRIVIAL_PATTERN.test((message || '').trim());
}

const userCooldowns = new Map(); // userId -> timestamp
const channelCooldowns = new Map(); // channelId -> timestamp

async function getActiveProvider() {
  for (const provider of getProviderChain()) {
    // eslint-disable-next-line no-await-in-loop
    if (await provider.isAvailable()) return provider;
  }
  return null;
}

async function isAiAvailable() {
  const provider = await getActiveProvider();
  return !!provider && provider.name !== 'local-disabled';
}

function isOnCooldown(userId, channelId) {
  const now = Date.now();
  const userLast = userCooldowns.get(userId) || 0;
  const channelLast = channelCooldowns.get(channelId) || 0;
  if (now - userLast < globalConfig.cooldowns.aiPerUserMs) return true;
  if (channelId && now - channelLast < (globalConfig.cooldowns.aiPerChannelMs || 0)) return true;
  return false;
}

function registerCooldown(userId, channelId) {
  const now = Date.now();
  userCooldowns.set(userId, now);
  if (channelId) channelCooldowns.set(channelId, now);
}

/**
 * Gera uma resposta para uma mensagem, respeitando configuracao, cooldown
 * (usuario + canal) e disponibilidade do provider ativo. Retorna null se nao
 * puder/dever responder (o chamador simplesmente nao envia nada).
 */
async function generate({ guildId, channelId, userId, message, botDisplayName }) {
  const cfg = getGuildConfig(guildId);
  if (!cfg.aiEnabled || !globalConfig.ai.enabled) return null;
  if (isOnCooldown(userId, channelId)) return null;

  const forceAlgorithm = isTrivialMessage(message);
  const provider = forceAlgorithm ? algorithmProvider : await getActiveProvider();
  if (!provider || provider.name === 'local-disabled') return null;

  const history = contextManager.getHistory(channelId);
  const startedAt = Date.now();

  const raw = await provider.generate({ guildId, channelId, userId, message, botDisplayName, history });

  logger.debug(
    `provider=${provider.name} trivial=${forceAlgorithm} latencia=${Date.now() - startedAt}ms sucesso=${!!raw}`,
    'ai'
  );

  if (!raw) return null;

  registerCooldown(userId, channelId);

  const limit = cfg.aiMaxReplyLength || globalConfig.ai.maxReplyLength;
  return raw.length > limit ? `${raw.slice(0, limit - 1).trim()}...` : raw;
}

function getObservability() {
  return {
    mode: AI_PROVIDER,
    ollama: ollamaProvider.getCircuitState ? ollamaProvider.getCircuitState() : null,
    groq: groqProvider.getCircuitState ? groqProvider.getCircuitState() : null
  };
}

module.exports = { generate, isAiAvailable, getActiveProvider, getObservability };
