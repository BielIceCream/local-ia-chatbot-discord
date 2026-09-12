'use strict';
const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../economy/economyManager');
const { getGuildConfig } = require('../../config/config');

function formatRemaining(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Recebe sua recompensa diaria.'),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.economyEnabled) {
      await interaction.reply({ content: 'A economia esta desativada neste servidor.', ephemeral: true });
      return;
    }
    const result = economyManager.claimDaily(interaction.guild.id, interaction.user.id);
    if (!result.ok) {
      await interaction.reply({ content: `⏳ Voce ja recebeu sua recompensa diaria. Tente novamente em ${formatRemaining(result.remainingMs)}.`, ephemeral: true });
      return;
    }
    await interaction.reply(`✅ Voce recebeu ${result.amount} ${cfg.currencyName}!`);
  }
};
