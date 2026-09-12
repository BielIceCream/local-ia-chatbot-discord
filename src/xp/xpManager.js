'use strict';

const usersDb = require('../database/users');
const { getGuildConfig } = require('../config/config');

function registerMessage(guildId, userId) {
  const cfg = getGuildConfig(guildId);
  if (!cfg.xpEnabled) return null;

  const current = usersDb.getXp(guildId, userId);
  const now = Date.now();
  if (now - current.last_message_at < cfg.xpCooldownMs) return null; // evita farm por spam

  const amount = Math.floor(Math.random() * (cfg.xpPerMessageMax - cfg.xpPerMessageMin + 1)) + cfg.xpPerMessageMin;
  return usersDb.addXp(guildId, userId, amount);
}

function getRank(guildId, userId) {
  return usersDb.getXp(guildId, userId);
}

function leaderboard(guildId, limit = 10) {
  return usersDb.leaderboard(guildId, limit);
}

function xpForNextLevel(level) {
  const nextLevel = level + 1;
  return Math.pow(nextLevel / 0.1, 2);
}

module.exports = { registerMessage, getRank, leaderboard, xpForNextLevel };
