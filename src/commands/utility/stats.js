'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTotalCommandUses } = require('../../database/database');
const aiManager = require('../../ai/aiManager');

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('stats').setDescription('Mostra estatisticas gerais do bot.'),
  async execute(interaction) {
    await interaction.deferReply();
    const client = interaction.client;

    const totalCommandUses = getTotalCommandUses();
    const aiAvailable = await aiManager.isAiAvailable();
    const mem = process.memoryUsage();

    const embed = new EmbedBuilder()
      .setTitle('📊 Estatisticas do bot')
      .addFields(
        { name: 'Servidores', value: String(client.guilds.cache.size), inline: true },
        { name: 'Canais', value: String(client.channels.cache.size), inline: true },
        { name: 'Usuarios (cache)', value: String(client.users.cache.size), inline: true },
        { name: 'Comandos executados', value: String(totalCommandUses), inline: true },
        { name: 'Uptime', value: formatUptime(process.uptime()), inline: true },
        { name: 'Latencia', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: 'Memoria usada', value: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`, inline: true },
        { name: 'IA local', value: aiAvailable ? '🟢 Disponivel' : '🔴 Indisponivel', inline: true }
      )
      .setColor('#5865F2')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
