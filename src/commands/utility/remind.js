'use strict';
const { SlashCommandBuilder } = require('discord.js');
const reminderService = require('../../services/reminderService');

function parseDuration(text) {
  const match = text.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * multipliers[unit];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Cria um lembrete.')
    .addStringOption((opt) => opt.setName('tempo').setDescription('Ex: 10m, 2h, 1d').setRequired(true))
    .addStringOption((opt) => opt.setName('mensagem').setDescription('O que lembrar').setRequired(true)),
  async execute(interaction) {
    const timeStr = interaction.options.getString('tempo');
    const message = interaction.options.getString('mensagem');
    const ms = parseDuration(timeStr);

    if (!ms) {
      await interaction.reply({ content: '❌ Formato de tempo invalido. Use algo como `10m`, `2h` ou `1d`.', ephemeral: true });
      return;
    }

    reminderService.create(interaction.guild.id, interaction.channel.id, interaction.user.id, message, Date.now() + ms);
    await interaction.reply(`⏰ Lembrete criado! Vou te avisar em ${timeStr}.`);
  }
};
