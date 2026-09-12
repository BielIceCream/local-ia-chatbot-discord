'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMembers } = require('../../moderation/permissions');
const { logModAction } = require('./_logHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Remove o banimento de um usuario.')
    .addStringOption((o) => o.setName('id_usuario').setDescription('ID do usuario a desbanir').setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
  async execute(interaction) {
    if (!canManageMembers(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const userId = interaction.options.getString('id_usuario');
    try {
      await interaction.guild.members.unban(userId);
      await interaction.reply(`✅ Usuario com ID ${userId} foi desbanido.`);
      await logModAction(interaction.guild, { action: 'Desbanimento', target: `<@${userId}>`, moderator: interaction.user });
    } catch (err) {
      await interaction.reply({ content: '❌ Nao foi possivel desbanir. Verifique se o ID esta correto e se o usuario esta banido.', ephemeral: true });
    }
  }
};
