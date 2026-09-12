'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMembers, canTarget } = require('../../moderation/permissions');
const { logModAction } = require('./_logHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um usuario do servidor.')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
  async execute(interaction) {
    if (!canManageMembers(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo');
    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({ content: '❌ Usuario nao encontrado no servidor.', ephemeral: true });
      return;
    }
    const check = canTarget(interaction.member, targetMember);
    if (!check.ok) {
      await interaction.reply({ content: `❌ ${check.reason}`, ephemeral: true });
      return;
    }

    await target.send(`Voce foi expulso de **${interaction.guild.name}**. Motivo: ${reason || 'Sem motivo especificado'}`).catch(() => {});
    await targetMember.kick(reason || undefined);
    await interaction.reply(`👢 ${target.tag} foi expulso.`);
    await logModAction(interaction.guild, { action: 'Expulsao', target, moderator: interaction.user, reason });
  }
};
