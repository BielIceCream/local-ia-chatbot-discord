'use strict';

const { state, nextId, scheduleSave } = require('../database/database');
const logger = require('../utils/logger');

const CHECK_INTERVAL_MS = 15000;

function start(client) {
  setInterval(async () => {
    const now = Date.now();
    const due = state.reminders.filter((r) => !r.fulfilled && r.remind_at <= now);
    if (due.length === 0) return;

    for (const reminder of due) {
      try {
        const channel = await client.channels.fetch(reminder.channel_id).catch(() => null);
        if (channel) {
          await channel.send(`⏰ <@${reminder.user_id}>, lembrete: ${reminder.message}`);
        }
      } catch (err) {
        logger.error(err, 'reminderService');
      } finally {
        reminder.fulfilled = true;
      }
    }
    scheduleSave();
  }, CHECK_INTERVAL_MS).unref();

  logger.info('Servico de lembretes iniciado.', 'reminderService');
}

function create(guildId, channelId, userId, message, remindAtTimestamp) {
  const id = nextId('reminders');
  state.reminders.push({
    id, guild_id: guildId, channel_id: channelId, user_id: userId,
    message, remind_at: remindAtTimestamp, created_at: Date.now(), fulfilled: false
  });
  scheduleSave();
  return id;
}

module.exports = { start, create };
