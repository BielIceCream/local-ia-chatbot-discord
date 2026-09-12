'use strict';

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../config/config');
const antiSpam = require('../moderation/antiSpam');
const logger = require('../utils/logger');
const { safe } = require('../errors/errorHandler');

function formatMessage(template, member) {
  return template
    .replaceAll('{user}', `${member}`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{memberCount}', String(member.guild.memberCount));
}

module.exports = {
  name: 'guildMemberAdd',
  execute: safe(async function execute(member, client) {
    const cfg = getGuildConfig(member.guild.id);

    if (cfg.antiRaidEnabled) {
      const possibleRaid = antiSpam.registerJoin(member.guild.id);
      if (possibleRaid) {
        logger.warn(`Possivel raid detectado em ${member.guild.name} (${member.guild.id})`, 'antiRaid');
        if (cfg.logChannelId) {
          const logChannel = member.guild.channels.cache.get(cfg.logChannelId);
          if (logChannel) {
            await logChannel.send('🚨 **Possivel raid detectado**: numero incomum de entradas em pouco tempo. Considere ativar o modo de verificacao no servidor.').catch(() => {});
          }
        }
      }
    }

    if (cfg.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(cfg.welcomeChannelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle('👋 Novo membro!')
          .setDescription(formatMessage(cfg.welcomeMessage, member))
          .setThumbnail(member.user.displayAvatarURL())
          .setColor('#57F287')
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }, 'guildMemberAdd')
};
