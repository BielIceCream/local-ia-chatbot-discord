'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Mostra a loja do servidor.'),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    const embed = new EmbedBuilder()
      .setTitle('🛒 Loja')
      .setDescription(`A loja ainda nao possui itens configurados.\nAdministradores podem estender este comando para vender cargos, itens ou vantagens usando ${cfg.currencyName}.`)
      .setColor('#5865F2');
    await interaction.reply({ embeds: [embed] });
  }
};
