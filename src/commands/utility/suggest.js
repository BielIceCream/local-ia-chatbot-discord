'use strict';
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig } = require('../../config/config');
const guildsDb = require('../../database/guilds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Envia uma sugestao para o servidor.')
    .addStringOption((o) => o.setName('texto').setDescription('Sua sugestao').setRequired(true)),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.suggestionsEnabled) {
      await interaction.reply({ content: 'O sistema de sugestoes esta desativado neste servidor.', ephemeral: true });
      return;
    }
    const text = interaction.options.getString('texto');
    const targetChannel = cfg.suggestionsChannelId ? interaction.guild.channels.cache.get(cfg.suggestionsChannelId) : interaction.channel;
    if (!targetChannel) {
      await interaction.reply({ content: '❌ Canal de sugestoes configurado nao foi encontrado.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('💡 Sugestao')
      .setDescription(text)
      .setFooter({ text: `Sugerido por ${interaction.user.tag}` })
      .setColor('#5865F2')
      .addFields({ name: '👍', value: '0', inline: true }, { name: '👎', value: '0', inline: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('suggestion_up').setLabel('Apoiar').setStyle(ButtonStyle.Success).setEmoji('👍'),
      new ButtonBuilder().setCustomId('suggestion_down').setLabel('Rejeitar').setStyle(ButtonStyle.Danger).setEmoji('👎')
    );

    const sent = await targetChannel.send({ embeds: [embed], components: [row] });
    guildsDb.suggestions.create(interaction.guild.id, targetChannel.id, sent.id, interaction.user.id, text);
    await interaction.reply({ content: `✅ Sugestao enviada em ${targetChannel}!`, ephemeral: true });
  }
};
