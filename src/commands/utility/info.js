'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pkg = require('../../../package.json');

module.exports = {
  data: new SlashCommandBuilder().setName('info').setDescription('Informacoes sobre o bot.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle(`ℹ️ ${interaction.client.user.username}`)
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { name: 'Versao', value: pkg.version, inline: true },
        { name: 'Servidores', value: String(interaction.client.guilds.cache.size), inline: true },
        { name: 'discord.js', value: require('discord.js').version, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'IA local', value: 'Ollama (sem chaves externas)', inline: true }
      )
      .setColor('#5865F2');
    await interaction.reply({ embeds: [embed] });
  }
};
