'use strict';
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { canManageServer } = require('../../moderation/permissions');
const { TICKET_TYPES } = require('../../tickets/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Publica o painel de abertura de tickets neste canal.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 Central de Atendimento')
      .setDescription('Clique em um dos botoes abaixo para abrir um ticket com a equipe.')
      .setColor('#5865F2');

    const buttons = Object.entries(TICKET_TYPES).map(([key, info]) =>
      new ButtonBuilder().setCustomId(`ticket_open_${key}`).setLabel(info.label).setEmoji(info.emoji).setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    await interaction.channel.send({ embeds: [embed], components: rows });
    await interaction.reply({ content: '✅ Painel de tickets publicado.', ephemeral: true });
  }
};
