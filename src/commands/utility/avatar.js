'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Mostra o avatar de um usuario em tamanho grande.')
    .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario alvo').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`Avatar de ${user.tag}`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setColor('#5865F2');
    await interaction.reply({ embeds: [embed] });
  }
};
