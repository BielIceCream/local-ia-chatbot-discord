'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('../../economy/economyManager');
const { getGuildConfig } = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Mostra seu saldo ou o de outro usuario.')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(false)),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.economyEnabled) {
      await interaction.reply({ content: 'A economia esta desativada neste servidor.', ephemeral: true });
      return;
    }
    const user = interaction.options.getUser('usuario') || interaction.user;
    const acc = economyManager.getBalance(interaction.guild.id, user.id);
    const embed = new EmbedBuilder()
      .setTitle(`💰 Carteira de ${user.username}`)
      .addFields(
        { name: 'Em maos', value: `${acc.balance} ${cfg.currencyName}`, inline: true },
        { name: 'No banco', value: `${acc.bank} ${cfg.currencyName}`, inline: true }
      )
      .setColor('#57F287');
    await interaction.reply({ embeds: [embed] });
  }
};
