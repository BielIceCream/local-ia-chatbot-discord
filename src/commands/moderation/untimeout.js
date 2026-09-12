'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMembers } = require('../../moderation/permissions');
const { logModAction } = require('./_logHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove o timeout de um usuario.')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    if (!canManageMembers(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('usuario');
    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({ content: '❌ Usuario nao encontrado no servidor.', ephemeral: true });
      return;
    }
    await targetMember.timeout(null);
    await interaction.reply(`🔊 O timeout de ${target} foi removido.`);
    await logModAction(interaction.guild, { action: 'Remocao de timeout', target, moderator: interaction.user });
  }
};
