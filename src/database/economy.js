'use strict';
const { state, scheduleSave } = require('./database');

function key(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getAccount(guildId, userId) {
  const k = key(guildId, userId);
  if (!state.economy[k]) {
    state.economy[k] = { guild_id: guildId, user_id: userId, balance: 0, bank: 0, last_daily: 0, last_work: 0 };
  }
  return state.economy[k];
}

function addBalance(guildId, userId, amount) {
  const acc = getAccount(guildId, userId);
  acc.balance += amount;
  scheduleSave();
  return acc;
}

function setLastDaily(guildId, userId, ts) {
  getAccount(guildId, userId).last_daily = ts;
  scheduleSave();
}

function setLastWork(guildId, userId, ts) {
  getAccount(guildId, userId).last_work = ts;
  scheduleSave();
}

function transfer(guildId, fromId, toId, amount) {
  const from = getAccount(guildId, fromId);
  if (from.balance < amount) return false;
  from.balance -= amount;
  addBalance(guildId, toId, amount);
  scheduleSave();
  return true;
}

function leaderboard(guildId, limit = 10) {
  return Object.values(state.economy)
    .filter((a) => a.guild_id === guildId)
    .sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank))
    .slice(0, limit);
}

module.exports = { getAccount, addBalance, setLastDaily, setLastWork, transfer, leaderboard };
