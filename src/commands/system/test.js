'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { canManageServer } = require('../../moderation/permissions');
const { healthCheck } = require('../../database/database');
const aiManager = require('../../ai/aiManager');
const guildsDb = require('../../database/guilds');
const economyManager = require('../../economy/economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Testa todos os modulos do bot (apenas administradores).')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    const results = [];

    results.push(['Discord', interaction.client.ws.status === 0]);

    results.push(['Database', healthCheck()]);

    results.push(['Commands', interaction.client.commands.size > 0]);

    try { results.push(['Moderation', typeof require('../../moderation/permissions').isAdmin === 'function']); } catch { results.push(['Moderation', false]); }

    try { guildsDb.tickets.listOpen(interaction.guild.id); results.push(['Tickets', true]); } catch { results.push(['Tickets', false]); }

    try { economyManager.getBalance(interaction.guild.id, interaction.user.id); results.push(['Economy', true]); } catch { results.push(['Economy', false]); }

    results.push(['AI', await aiManager.isAiAvailable()]);

    try {
      const contextManager = require('../../ai/contextManager');
      contextManager.getHistory(interaction.channel.id);
      results.push(['Memory', true]);
    } catch { results.push(['Memory', false]); }

    const { getGuildConfig } = require('../../config/config');
    const cfg = getGuildConfig(interaction.guild.id);
    results.push(['Logging', !!cfg]);

    const padLength = Math.max(...results.map(([name]) => name.length)) + 2;
    const lines = results.map(([name, ok]) => `${name.padEnd(padLength, '.')} ${ok ? '✓' : '✗'}`);

    const embed = new EmbedBuilder()
      .setTitle('🧪 BOT TEST')
      .setDescription(`\`\`\`\n${lines.join('\n')}\n\`\`\``)
      .setColor(results.every(([, ok]) => ok) ? '#57F287' : '#FEE75C');

    await interaction.editReply({ embeds: [embed] });
  }
};
