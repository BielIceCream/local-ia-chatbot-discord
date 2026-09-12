'use strict';
const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../config/config');

async function logModAction(guild, { action, target, moderator, reason, extra }) {
  const cfg = getGuildConfig(guild.id);
  if (!cfg.logChannelId) return;
  const channel = guild.channels.cache.get(cfg.logChannelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(`🛡️ Moderacao - ${action}`)
    .addFields(
      { name: 'Usuario', value: `${target}`, inline: true },
      { name: 'Moderador', value: `${moderator}`, inline: true },
      { name: 'Motivo', value: reason || 'Sem motivo especificado' }
    )
    .setColor('#ED4245')
    .setTimestamp();

  if (extra) embed.addFields(extra);

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { logModAction };
