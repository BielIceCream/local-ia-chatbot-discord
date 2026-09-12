'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { canManageServer } = require('../../moderation/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Envia um anuncio formatado em um canal.')
    .addChannelOption((o) => o.setName('canal').setDescription('Canal de destino').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('titulo').setDescription('Titulo do anuncio').setRequired(true))
    .addStringOption((o) => o.setName('mensagem').setDescription('Conteudo do anuncio').setRequired(true))
    .addBooleanOption((o) => o.setName('mencionar-everyone').setDescription('Mencionar @everyone').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const channel = interaction.options.getChannel('canal');
    const title = interaction.options.getString('titulo');
    const message = interaction.options.getString('mensagem');
    const mentionEveryone = interaction.options.getBoolean('mencionar-everyone');

    const embed = new EmbedBuilder().setTitle(`📢 ${title}`).setDescription(message).setColor('#5865F2').setTimestamp();
    await channel.send({ content: mentionEveryone ? '@everyone' : undefined, embeds: [embed] });
    await interaction.reply({ content: `✅ Anuncio enviado em ${channel}.`, ephemeral: true });
  }
};
