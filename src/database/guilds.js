'use strict';
// Dados operacionais adicionais (tickets, sugestoes). Configuracoes de guild
// continuam em src/config/config.js (um JSON por servidor).
const { state, nextId, scheduleSave } = require('./database');

const tickets = {
  create(guildId, channelId, userId, type) {
    const id = nextId('tickets');
    state.tickets.push({
      id, guild_id: guildId, channel_id: channelId, user_id: userId,
      type, status: 'open', created_at: Date.now(), closed_at: null
    });
    scheduleSave();
    return id;
  },
  close(channelId) {
    const ticket = state.tickets.find((t) => t.channel_id === channelId);
    if (ticket) {
      ticket.status = 'closed';
      ticket.closed_at = Date.now();
      scheduleSave();
    }
  },
  get(channelId) {
    return state.tickets.find((t) => t.channel_id === channelId);
  },
  listOpen(guildId) {
    return state.tickets.filter((t) => t.guild_id === guildId && t.status === 'open');
  }
};

const suggestions = {
  create(guildId, channelId, messageId, userId, content) {
    const id = nextId('suggestions');
    state.suggestions.push({
      id, guild_id: guildId, channel_id: channelId, message_id: messageId,
      user_id: userId, content, status: 'pending', upvotes: 0, downvotes: 0, created_at: Date.now()
    });
    scheduleSave();
    return id;
  },
  get(messageId) {
    return state.suggestions.find((s) => s.message_id === messageId);
  },
  setStatus(messageId, status) {
    const s = state.suggestions.find((s) => s.message_id === messageId);
    if (s) { s.status = status; scheduleSave(); }
  },
  vote(messageId, upvotes, downvotes) {
    const s = state.suggestions.find((s) => s.message_id === messageId);
    if (s) { s.upvotes = upvotes; s.downvotes = downvotes; scheduleSave(); }
  }
};

module.exports = { tickets, suggestions };
