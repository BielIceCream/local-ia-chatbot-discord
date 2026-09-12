'use strict';
const { state, scheduleSave } = require('./database');

function k(guildId, key) {
  return `${guildId}:${key}`;
}

function set(guildId, key, value) {
  state.memory[k(guildId, key)] = { guild_id: guildId, key, value, updated_at: Date.now() };
  scheduleSave();
}

function get(guildId, key) {
  const row = state.memory[k(guildId, key)];
  return row ? row.value : null;
}

function list(guildId) {
  return Object.values(state.memory)
    .filter((r) => r.guild_id === guildId)
    .sort((a, b) => b.updated_at - a.updated_at);
}

function remove(guildId, key) {
  const kk = k(guildId, key);
  if (state.memory[kk]) {
    delete state.memory[kk];
    scheduleSave();
    return 1;
  }
  return 0;
}

module.exports = { set, get, list, remove };
