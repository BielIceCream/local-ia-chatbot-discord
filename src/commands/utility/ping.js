'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Mostra a latencia do bot.'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Calculando...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Latencia da mensagem', value: `${latency}ms`, inline: true },
        { name: 'Latencia da API', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
      )
      .setColor('#5865F2');
    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
