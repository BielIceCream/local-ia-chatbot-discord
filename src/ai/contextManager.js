'use strict';

// Memoria TEMPORARIA: historico curto e controlado por canal, usado apenas
// para entender o contexto imediato da conversa (ex: "por que?" referindo-se
// a mensagem anterior). Nunca persiste em disco e expira automaticamente.
const { global: globalConfig, getGuildConfig } = require('../config/config');

const channelHistories = new Map(); // channelId -> [{authorId, authorName, content, timestamp, isBot}]

function keyFor(channelId) {
  return channelId;
}

function addMessage(guildId, channelId, message) {
  const cfg = getGuildConfig(guildId);
  const limit = cfg.contextMessageLimit || globalConfig.context.maxMessagesPerChannel;
  const key = keyFor(channelId);
  const list = channelHistories.get(key) || [];
  list.push({ ...message, timestamp: Date.now() });
  while (list.length > limit) list.shift();
  channelHistories.set(key, list);
}

function getHistory(channelId) {
  const list = channelHistories.get(keyFor(channelId)) || [];
  const expirationMs = globalConfig.context.expirationMs;
  const cutoff = Date.now() - expirationMs;
  return list.filter((m) => m.timestamp >= cutoff);
}

function clearChannel(channelId) {
  channelHistories.delete(keyFor(channelId));
}

// Limpeza periodica para nunca acumular memoria indefinidamente
function startCleanupLoop() {
  const interval = globalConfig.context.cleanupIntervalMs;
  setInterval(() => {
    const expirationMs = globalConfig.context.expirationMs;
    const cutoff = Date.now() - expirationMs;
    for (const [key, list] of channelHistories.entries()) {
      const filtered = list.filter((m) => m.timestamp >= cutoff);
      if (filtered.length === 0) channelHistories.delete(key);
      else channelHistories.set(key, filtered);
    }
  }, interval).unref();
}

module.exports = { addMessage, getHistory, clearChannel, startCleanupLoop };
