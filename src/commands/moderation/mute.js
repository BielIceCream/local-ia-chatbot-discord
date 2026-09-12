'use strict';
// Alias amigavel de /timeout, mantido por familiaridade com bots antigos.
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMembers, canTarget } = require('../../moderation/permissions');
const { logModAction } = require('./_logHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silencia um usuario (equivalente a /timeout).')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(true))
    .addIntegerOption((o) => o.setName('minutos').setDescription('Duracao em minutos').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),
  async execute(interaction) {
    if (!canManageMembers(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('usuario');
    const minutes = interaction.options.getInteger('minutos');
    const reason = interaction.options.getString('motivo');
    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({ content: '❌ Usuario nao encontrado.', ephemeral: true });
      return;
    }
    const check = canTarget(interaction.member, targetMember);
    if (!check.ok) {
      await interaction.reply({ content: `❌ ${check.reason}`, ephemeral: true });
      return;
    }
    await targetMember.timeout(minutes * 60000, reason || undefined);
    await interaction.reply(`🔇 ${target} foi silenciado por ${minutes} minuto(s).`);
    await logModAction(interaction.guild, { action: 'Mute', target, moderator: interaction.user, reason });
  }
};
