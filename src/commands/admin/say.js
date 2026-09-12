'use strict';
const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { canManageServer } = require('../../moderation/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Faz o bot enviar uma mensagem em texto puro.')
    .addStringOption((o) => o.setName('mensagem').setDescription('Mensagem a enviar').setRequired(true))
    .addChannelOption((o) => o.setName('canal').setDescription('Canal de destino (padrao: canal atual)').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const message = interaction.options.getString('mensagem');
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    await channel.send(message);
    await interaction.reply({ content: `✅ Mensagem enviada em ${channel}.`, ephemeral: true });
  }
};
