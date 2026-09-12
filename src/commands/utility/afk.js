'use strict';
const { SlashCommandBuilder } = require('discord.js');
const usersDb = require('../../database/users');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Marca voce como AFK.')
    .addStringOption((opt) => opt.setName('motivo').setDescription('Motivo do AFK').setRequired(false)),
  async execute(interaction) {
    const reason = interaction.options.getString('motivo') || 'AFK';
    usersDb.setAfk(interaction.guild.id, interaction.user.id, reason);
    await interaction.reply(`💤 Voce foi marcado como AFK: ${reason}`);
  }
};
