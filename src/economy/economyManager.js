'use strict';

const economyDb = require('../database/economy');

const DAILY_AMOUNT = 100;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const WORK_MIN = 20;
const WORK_MAX = 80;
const WORK_COOLDOWN_MS = 60 * 60 * 1000;

function getBalance(guildId, userId) {
  return economyDb.getAccount(guildId, userId);
}

function claimDaily(guildId, userId) {
  const acc = economyDb.getAccount(guildId, userId);
  const now = Date.now();
  if (now - acc.last_daily < DAILY_COOLDOWN_MS) {
    const remaining = DAILY_COOLDOWN_MS - (now - acc.last_daily);
    return { ok: false, remainingMs: remaining };
  }
  economyDb.addBalance(guildId, userId, DAILY_AMOUNT);
  economyDb.setLastDaily(guildId, userId, now);
  return { ok: true, amount: DAILY_AMOUNT };
}

function work(guildId, userId) {
  const acc = economyDb.getAccount(guildId, userId);
  const now = Date.now();
  if (now - acc.last_work < WORK_COOLDOWN_MS) {
    const remaining = WORK_COOLDOWN_MS - (now - acc.last_work);
    return { ok: false, remainingMs: remaining };
  }
  const amount = Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;
  economyDb.addBalance(guildId, userId, amount);
  economyDb.setLastWork(guildId, userId, now);
  return { ok: true, amount };
}

function pay(guildId, fromId, toId, amount) {
  if (amount <= 0) return { ok: false, reason: 'Valor invalido.' };
  const success = economyDb.transfer(guildId, fromId, toId, amount);
  return success ? { ok: true } : { ok: false, reason: 'Saldo insuficiente.' };
}

function leaderboard(guildId, limit = 10) {
  return economyDb.leaderboard(guildId, limit);
}

module.exports = { getBalance, claimDaily, work, pay, leaderboard, DAILY_AMOUNT };
