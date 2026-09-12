'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { canManageServer } = require('../../moderation/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Envia um embed customizado.')
    .addStringOption((o) => o.setName('titulo').setDescription('Titulo').setRequired(true))
    .addStringOption((o) => o.setName('descricao').setDescription('Descricao').setRequired(true))
    .addStringOption((o) => o.setName('cor').setDescription('Cor em hexadecimal, ex: #5865F2').setRequired(false))
    .addChannelOption((o) => o.setName('canal').setDescription('Canal de destino (padrao: canal atual)').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const title = interaction.options.getString('titulo');
    const description = interaction.options.getString('descricao');
    const color = interaction.options.getString('cor') || '#5865F2';
    const channel = interaction.options.getChannel('canal') || interaction.channel;

    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Embed enviado em ${channel}.`, ephemeral: true });
  }
};
