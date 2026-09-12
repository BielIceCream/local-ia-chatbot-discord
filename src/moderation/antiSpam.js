'use strict';

// Deteccao simples e eficiente de spam/flood/raid, sem dependencias externas.
const messageLogByUser = new Map(); // userId -> [timestamps]
const joinLogByGuild = new Map(); // guildId -> [timestamps]

const FLOOD_WINDOW_MS = 7000;
const FLOOD_MAX_MESSAGES = 6;
const DUPLICATE_WINDOW_MS = 15000;
const lastMessageContentByUser = new Map(); // userId -> { content, count, timestamp }

const RAID_WINDOW_MS = 10000;
const RAID_JOIN_THRESHOLD = 8;

function isMessageSpam(message) {
  const userId = message.author.id;
  const now = Date.now();

  const timestamps = (messageLogByUser.get(userId) || []).filter((t) => now - t < FLOOD_WINDOW_MS);
  timestamps.push(now);
  messageLogByUser.set(userId, timestamps);
  const isFlooding = timestamps.length > FLOOD_MAX_MESSAGES;

  const last = lastMessageContentByUser.get(userId);
  let isDuplicateSpam = false;
  if (last && last.content === message.content && now - last.timestamp < DUPLICATE_WINDOW_MS) {
    last.count += 1;
    last.timestamp = now;
    isDuplicateSpam = last.count >= 3;
  } else {
    lastMessageContentByUser.set(userId, { content: message.content, count: 1, timestamp: now });
  }

  const mentionSpam = message.mentions.users.size + message.mentions.roles.size > 6;

  return isFlooding || isDuplicateSpam || mentionSpam;
}

function containsLink(content) {
  return /(https?:\/\/|discord\.gg\/|www\.)/i.test(content);
}

function registerJoin(guildId) {
  const now = Date.now();
  const joins = (joinLogByGuild.get(guildId) || []).filter((t) => now - t < RAID_WINDOW_MS);
  joins.push(now);
  joinLogByGuild.set(guildId, joins);
  return joins.length >= RAID_JOIN_THRESHOLD;
}

// Limpeza periodica para evitar crescimento indefinido de memoria
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of messageLogByUser.entries()) {
    const filtered = timestamps.filter((t) => now - t < FLOOD_WINDOW_MS);
    if (filtered.length === 0) messageLogByUser.delete(userId);
    else messageLogByUser.set(userId, filtered);
  }
  for (const [guildId, joins] of joinLogByGuild.entries()) {
    const filtered = joins.filter((t) => now - t < RAID_WINDOW_MS);
    if (filtered.length === 0) joinLogByGuild.delete(guildId);
    else joinLogByGuild.set(guildId, filtered);
  }
}, 60000).unref();

module.exports = { isMessageSpam, containsLink, registerJoin };
