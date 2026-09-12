'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageMessages } = require('../../moderation/permissions');
const { logModAction } = require('./_logHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Apaga uma quantidade de mensagens do canal.')
    .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantidade (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName('usuario').setDescription('Apagar apenas mensagens deste usuario').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
  async execute(interaction) {
    if (!canManageMessages(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const amount = interaction.options.getInteger('quantidade');
    const user = interaction.options.getUser('usuario');

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    let targetMessages = [...messages.values()];
    if (user) targetMessages = targetMessages.filter((m) => m.author.id === user.id);
    targetMessages = targetMessages.slice(0, amount);

    const deleted = await interaction.channel.bulkDelete(targetMessages, true).catch(() => []);
    await interaction.editReply(`🧹 ${deleted.size} mensagem(ns) apagada(s).`);
    await logModAction(interaction.guild, { action: 'Limpeza de mensagens', target: user || interaction.channel, moderator: interaction.user, reason: `${deleted.size} mensagens apagadas em ${interaction.channel}` });
  }
};
