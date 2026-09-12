'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMembers, canTarget } = require('../../moderation/permissions');
const warningsDb = require('../../database/warnings');
const { logModAction } = require('./_logHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Aplica uma advertencia a um usuario.')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo da advertencia').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    if (!canManageMembers(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo');
    const targetMember = interaction.guild.members.cache.get(target.id);

    const check = canTarget(interaction.member, targetMember);
    if (!check.ok) {
      await interaction.reply({ content: `❌ ${check.reason}`, ephemeral: true });
      return;
    }

    const id = warningsDb.add(interaction.guild.id, target.id, interaction.user.id, reason);
    await interaction.reply(`⚠️ ${target} foi advertido. (ID da advertencia: ${id})`);
    await logModAction(interaction.guild, { action: 'Advertencia', target, moderator: interaction.user, reason });
    await target.send(`Voce recebeu uma advertencia em **${interaction.guild.name}**. Motivo: ${reason || 'Sem motivo especificado'}`).catch(() => {});
  }
};
