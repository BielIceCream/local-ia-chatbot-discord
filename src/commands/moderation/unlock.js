'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMessages } = require('../../moderation/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloqueia o canal atual para @everyone.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
  async execute(interaction) {
    if (!canManageMessages(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
    await interaction.reply('🔓 Canal desbloqueado.');
  }
};
