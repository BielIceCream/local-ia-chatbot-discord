'use strict';
const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../economy/economyManager');
const { getGuildConfig } = require('../../config/config');

function formatRemaining(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

const FLAVORS = [
  'Voce trabalhou como entregador e ganhou',
  'Voce ajudou em um projeto freelancer e ganhou',
  'Voce vendeu artesanato no servidor e ganhou',
  'Voce fez um bico rapido e ganhou'
];

module.exports = {
  data: new SlashCommandBuilder().setName('work').setDescription('Trabalhe para ganhar moedas.'),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.economyEnabled) {
      await interaction.reply({ content: 'A economia esta desativada neste servidor.', ephemeral: true });
      return;
    }
    const result = economyManager.work(interaction.guild.id, interaction.user.id);
    if (!result.ok) {
      await interaction.reply({ content: `⏳ Voce esta cansado. Tente trabalhar novamente em ${formatRemaining(result.remainingMs)}.`, ephemeral: true });
      return;
    }
    const flavor = FLAVORS[Math.floor(Math.random() * FLAVORS.length)];
    await interaction.reply(`💼 ${flavor} ${result.amount} ${cfg.currencyName}!`);
  }
};
