'use strict';
const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../economy/economyManager');
const { getGuildConfig } = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfere moedas para outro usuario.')
    .addUserOption((o) => o.setName('usuario').setDescription('Destinatario').setRequired(true))
    .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantidade a transferir').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.economyEnabled) {
      await interaction.reply({ content: 'A economia esta desativada neste servidor.', ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('quantidade');

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: '❌ Voce nao pode pagar a si mesmo.', ephemeral: true });
      return;
    }
    if (target.bot) {
      await interaction.reply({ content: '❌ Voce nao pode pagar um bot.', ephemeral: true });
      return;
    }

    const result = economyManager.pay(interaction.guild.id, interaction.user.id, target.id, amount);
    if (!result.ok) {
      await interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
      return;
    }
    await interaction.reply(`✅ Voce transferiu ${amount} ${cfg.currencyName} para ${target}.`);
  }
};
