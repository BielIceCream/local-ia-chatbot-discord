'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const xpManager = require('../../xp/xpManager');
const { getGuildConfig } = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder().setName('xp-leaderboard').setDescription('Mostra o ranking de XP do servidor.'),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.xpEnabled) {
      await interaction.reply({ content: 'O sistema de XP esta desativado neste servidor.', ephemeral: true });
      return;
    }
    const top = xpManager.leaderboard(interaction.guild.id, 10);
    if (top.length === 0) {
      await interaction.reply('Ainda nao ha dados suficientes para um ranking.');
      return;
    }
    const lines = top.map((row, i) => `**${i + 1}.** <@${row.user_id}> — Nivel ${row.level} (${row.xp} XP)`);
    const embed = new EmbedBuilder().setTitle('🏆 Ranking de XP').setDescription(lines.join('\n')).setColor('#FEE75C');
    await interaction.reply({ embeds: [embed] });
  }
};
