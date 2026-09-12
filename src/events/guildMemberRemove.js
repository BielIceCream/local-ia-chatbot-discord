'use strict';

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../config/config');
const { safe } = require('../errors/errorHandler');

function formatMessage(template, member) {
  return template
    .replaceAll('{user}', member.user ? member.user.tag : 'Usuario')
    .replaceAll('{username}', member.user ? member.user.username : 'Usuario')
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{memberCount}', String(member.guild.memberCount));
}

module.exports = {
  name: 'guildMemberRemove',
  execute: safe(async function execute(member, client) {
    const cfg = getGuildConfig(member.guild.id);
    if (!cfg.leaveChannelId) return;
    const channel = member.guild.channels.cache.get(cfg.leaveChannelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('👋 Membro saiu')
      .setDescription(formatMessage(cfg.leaveMessage, member))
      .setColor('#ED4245')
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  }, 'guildMemberRemove')
};
