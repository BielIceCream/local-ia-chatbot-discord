'use strict';

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../config/config');
const { safe } = require('../errors/errorHandler');

module.exports = {
  name: 'messageDelete',
  execute: safe(async function execute(message, client) {
    if (!message.guild || (message.author && message.author.bot)) return;
    const cfg = getGuildConfig(message.guild.id);
    if (!cfg.logChannelId) return;
    const logChannel = message.guild.channels.cache.get(cfg.logChannelId);
    if (!logChannel || logChannel.id === message.channel.id) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Mensagem apagada')
      .addFields(
        { name: 'Autor', value: message.author ? `${message.author}` : 'Desconhecido', inline: true },
        { name: 'Canal', value: `${message.channel}`, inline: true },
        { name: 'Conteudo', value: message.content ? message.content.slice(0, 1000) : '*sem conteudo em cache*' }
      )
      .setColor('#ED4245')
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }, 'messageDelete')
};
