'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMembers, canTarget } = require('../../moderation/permissions');
const { logModAction } = require('./_logHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um usuario do servidor.')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
    .addIntegerOption((o) => o.setName('dias_mensagens').setDescription('Dias de mensagens a apagar (0-7)').setMinValue(0).setMaxValue(7).setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
  async execute(interaction) {
    if (!canManageMembers(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo');
    const deleteDays = interaction.options.getInteger('dias_mensagens') || 0;
    const targetMember = interaction.guild.members.cache.get(target.id);

    if (targetMember) {
      const check = canTarget(interaction.member, targetMember);
      if (!check.ok) {
        await interaction.reply({ content: `❌ ${check.reason}`, ephemeral: true });
        return;
      }
    }

    await target.send(`Voce foi banido de **${interaction.guild.name}**. Motivo: ${reason || 'Sem motivo especificado'}`).catch(() => {});
    await interaction.guild.members.ban(target.id, { deleteMessageSeconds: deleteDays * 86400, reason: reason || undefined });
    await interaction.reply(`🔨 ${target.tag} foi banido.`);
    await logModAction(interaction.guild, { action: 'Banimento', target, moderator: interaction.user, reason });
  }
};
