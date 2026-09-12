'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('server').setDescription('Mostra informacoes sobre o servidor.'),
  async execute(interaction) {
    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: 'Dono', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Membros', value: String(guild.memberCount), inline: true },
        { name: 'Canais', value: String(guild.channels.cache.size), inline: true },
        { name: 'Cargos', value: String(guild.roles.cache.size), inline: true },
        { name: 'Criado em', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Nivel de boost', value: `${guild.premiumTier}`, inline: true }
      )
      .setColor('#5865F2');
    await interaction.reply({ embeds: [embed] });
  }
};
