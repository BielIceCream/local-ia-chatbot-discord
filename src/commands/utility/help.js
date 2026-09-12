'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Mostra todos os comandos disponiveis.'),
  async execute(interaction, { client }) {
    const categories = {};
    for (const command of client.commands.values()) {
      const cat = command.category || 'geral';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(`\`/${command.data.name}\` - ${command.data.description}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('📖 Central de Ajuda')
      .setColor('#5865F2')
      .setDescription('Lista de todos os comandos disponiveis, organizados por categoria.');

    for (const [cat, list] of Object.entries(categories)) {
      embed.addFields({ name: `**${cat.toUpperCase()}**`, value: list.join('\n') });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
