'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('servericon').setDescription('Mostra o icone do servidor em tamanho grande.'),
  async execute(interaction) {
    if (!interaction.guild.iconURL()) {
      await interaction.reply({ content: 'Este servidor nao possui um icone definido.', ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(`Icone de ${interaction.guild.name}`)
      .setImage(interaction.guild.iconURL({ size: 1024 }))
      .setColor('#5865F2');
    await interaction.reply({ embeds: [embed] });
  }
};
