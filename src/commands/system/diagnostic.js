'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { canManageServer } = require('../../moderation/permissions');
const { healthCheck, isEncryptionEnabled } = require('../../database/database');
const aiManager = require('../../ai/aiManager');
const spendGuard = require('../../ai/spendGuard');
const { getGuildConfig, global: globalConfig } = require('../../config/config');
const { CREATOR_ID } = require('../../moderation/creatorAuth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diagnostic')
    .setDescription('Executa um diagnostico completo do bot.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para usar este comando.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    const checks = [];

    checks.push(['Discord', interaction.client.ws.status === 0]);
    checks.push(['Database', healthCheck()]);
    checks.push(['Commands', interaction.client.commands.size > 0]);

    try {
      const cfg = getGuildConfig(interaction.guild.id);
      checks.push(['Configuration', !!cfg]);
    } catch {
      checks.push(['Configuration', false]);
    }

    checks.push(['Permissions', interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)]);

    const aiAvailable = await aiManager.isAiAvailable();
    checks.push(['AI', aiAvailable]);
    checks.push(['Memory (heap)', process.memoryUsage().heapUsed < process.memoryUsage().heapTotal]);
    checks.push(['Creator ID configurado', !!CREATOR_ID]);

    const observability = aiManager.getObservability();
    const groqUsage = spendGuard.getUsage('groq');
    const groqCap = (globalConfig.spending && globalConfig.spending.groq && globalConfig.spending.groq.monthlyLimitBRL) || 0;

    const embed = new EmbedBuilder()
      .setTitle('🔎 Diagnostico do bot')
      .setColor(checks.every(([, ok]) => ok) ? '#57F287' : '#FEE75C')
      .setDescription(checks.map(([name, ok]) => `${ok ? '✅' : '⚠️'} ${name}`).join('\n'))
      .addFields(
        { name: 'Modo de IA', value: observability.mode, inline: true },
        { name: 'Criptografia do banco', value: isEncryptionEnabled() ? '🔒 Ativada' : '⚠️ Desativada', inline: true },
        { name: 'RAM do processo', value: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`, inline: true }
      );

    if (observability.mode === 'ollama' && observability.ollama) {
      embed.addFields({ name: 'Circuit breaker - Ollama', value: observability.ollama.open ? `🔴 Aberto (${observability.ollama.failures} falhas)` : '🟢 Fechado', inline: true });
    }
    if ((observability.mode === 'ollama' || observability.mode === 'groq') && observability.groq) {
      embed.addFields(
        { name: 'Circuit breaker - Groq', value: observability.groq.open ? `🔴 Aberto (${observability.groq.failures} falhas)` : '🟢 Fechado', inline: true },
        { name: 'Gasto Groq (mes atual)', value: `R$${groqUsage.estimatedCostBRL.toFixed(4)} / R$${groqCap.toFixed(2)}`, inline: true }
      );
    }

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
