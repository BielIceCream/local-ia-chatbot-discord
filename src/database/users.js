'use strict';
const { state, scheduleSave } = require('./database');

function k(guildId, userId) {
  return `${guildId}:${userId}`;
}

function levelFromXp(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

function getXp(guildId, userId) {
  const key = k(guildId, userId);
  if (!state.xp[key]) {
    state.xp[key] = { guild_id: guildId, user_id: userId, xp: 0, level: 0, last_message_at: 0 };
  }
  return state.xp[key];
}

function addXp(guildId, userId, amount) {
  const row = getXp(guildId, userId);
  row.xp += amount;
  const newLevel = levelFromXp(row.xp);
  const leveledUp = newLevel > row.level;
  row.level = newLevel;
  row.last_message_at = Date.now();
  scheduleSave();
  return { row, leveledUp };
}

function leaderboard(guildId, limit = 10) {
  return Object.values(state.xp)
    .filter((r) => r.guild_id === guildId)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

function getAfk(guildId, userId) {
  return state.afk[k(guildId, userId)] || null;
}

function setAfk(guildId, userId, reason) {
  state.afk[k(guildId, userId)] = { reason: reason || 'AFK', created_at: Date.now() };
  scheduleSave();
}

function removeAfk(guildId, userId) {
  delete state.afk[k(guildId, userId)];
  scheduleSave();
}

module.exports = { getXp, addXp, leaderboard, getAfk, setAfk, removeAfk, levelFromXp };
