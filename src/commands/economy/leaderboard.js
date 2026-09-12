'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('../../economy/economyManager');
const { getGuildConfig } = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('Mostra o ranking de moedas do servidor.'),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    const top = economyManager.leaderboard(interaction.guild.id, 10);
    if (top.length === 0) {
      await interaction.reply('Ainda nao ha dados suficientes para um ranking.');
      return;
    }
    const lines = top.map((acc, i) => `**${i + 1}.** <@${acc.user_id}> — ${acc.balance + acc.bank} ${cfg.currencyName}`);
    const embed = new EmbedBuilder().setTitle('🏆 Ranking de economia').setDescription(lines.join('\n')).setColor('#FEE75C');
    await interaction.reply({ embeds: [embed] });
  }
};
