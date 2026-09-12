'use strict';
const { state, nextId, scheduleSave } = require('./database');

function add(guildId, userId, moderatorId, reason) {
  const id = nextId('warnings');
  state.warnings.push({
    id,
    guild_id: guildId,
    user_id: userId,
    moderator_id: moderatorId,
    reason: reason || 'Sem motivo especificado',
    created_at: Date.now()
  });
  scheduleSave();
  return id;
}

function list(guildId, userId) {
  return state.warnings
    .filter((w) => w.guild_id === guildId && w.user_id === userId)
    .sort((a, b) => b.created_at - a.created_at);
}

function clear(guildId, userId) {
  const before = state.warnings.length;
  state.warnings = state.warnings.filter((w) => !(w.guild_id === guildId && w.user_id === userId));
  scheduleSave();
  return before - state.warnings.length;
}

function remove(guildId, warningId) {
  const before = state.warnings.length;
  state.warnings = state.warnings.filter((w) => !(w.id === warningId && w.guild_id === guildId));
  scheduleSave();
  return before - state.warnings.length;
}

module.exports = { add, list, clear, remove };
