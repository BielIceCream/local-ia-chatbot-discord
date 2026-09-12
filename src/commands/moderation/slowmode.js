'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMessages } = require('../../moderation/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Define o modo lento do canal atual.')
    .addIntegerOption((o) => o.setName('segundos').setDescription('Segundos entre mensagens (0 para desativar)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
  async execute(interaction) {
    if (!canManageMessages(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    const seconds = interaction.options.getInteger('segundos');
    await interaction.channel.setRateLimitPerUser(seconds);
    await interaction.reply(seconds === 0 ? '✅ Modo lento desativado.' : `🐢 Modo lento definido para ${seconds} segundos.`);
  }
};
