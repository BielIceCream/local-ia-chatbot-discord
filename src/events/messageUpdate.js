'use strict';

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../config/config');
const { safe } = require('../errors/errorHandler');

module.exports = {
  name: 'messageUpdate',
  execute: safe(async function execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || (newMessage.author && newMessage.author.bot)) return;
    if (oldMessage.content === newMessage.content) return;
    const cfg = getGuildConfig(newMessage.guild.id);
    if (!cfg.logChannelId) return;
    const logChannel = newMessage.guild.channels.cache.get(cfg.logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Mensagem editada')
      .addFields(
        { name: 'Autor', value: `${newMessage.author}`, inline: true },
        { name: 'Canal', value: `${newMessage.channel}`, inline: true },
        { name: 'Antes', value: (oldMessage.content || '*vazio*').slice(0, 500) },
        { name: 'Depois', value: (newMessage.content || '*vazio*').slice(0, 500) }
      )
      .setColor('#FEE75C')
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }, 'messageUpdate')
};
