'use strict';
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canManageServer } = require('../../moderation/permissions');
const { backup, verifyBackup, isEncryptionEnabled } = require('../../database/database');
const auditLog = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Cria (e verifica) um backup do banco de dados do bot.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    const path = backup();
    // Item 13: testar periodicamente se um backup realmente pode ser
    // restaurado - aqui, imediatamente apos criar cada um.
    const check = verifyBackup(path);

    auditLog.record(interaction.user.id, 'backup.create', { path, verified: check.ok }, check.ok ? 'ok' : 'verify_failed');

    const encryptionNote = isEncryptionEnabled()
      ? '🔒 Criptografado (AES-256-GCM).'
      : '⚠️ Sem criptografia (defina MEMORY_ENCRYPTION_KEY no .env para producao).';

    if (!check.ok) {
      await interaction.editReply(`⚠️ Backup criado em \`${path}\`, mas a verificacao de integridade falhou: ${check.reason}`);
      return;
    }

    await interaction.editReply(`✅ Backup criado e verificado em: \`${path}\`\n${encryptionNote}`);
  }
};
