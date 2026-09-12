'use strict';
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ChannelType } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../config/config');
const { canManageServer } = require('../../moderation/permissions');
const auditLog = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura o bot para este servidor.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand((sub) => sub.setName('ver').setDescription('Mostra a configuracao atual'))
    .addSubcommand((sub) => sub
      .setName('canal-logs')
      .setDescription('Define o canal de logs')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal de logs').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('canal-boas-vindas')
      .setDescription('Define o canal de boas-vindas')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('canal-despedida')
      .setDescription('Define o canal de despedida')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('canal-ia')
      .setDescription('Restringe a IA a um unico canal (vazio = todos os canais)')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(false)))
    .addSubcommand((sub) => sub
      .setName('ia-ativada')
      .setDescription('Ativa ou desativa a IA neste servidor')
      .addBooleanOption((o) => o.setName('valor').setDescription('true/false').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('cargo-admin')
      .setDescription('Adiciona um cargo com permissao administrativa no bot')
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('cargo-moderador')
      .setDescription('Adiciona um cargo com permissao de moderacao no bot')
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('canal-silencioso')
      .setDescription('Impede que a IA responda neste canal')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('contexto')
      .setDescription('Define quantas mensagens de contexto a IA usa')
      .addIntegerOption((o) => o.setName('quantidade').setDescription('1-30').setMinValue(1).setMaxValue(30).setRequired(true))),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Voce precisa de permissao "Gerenciar Servidor" para configurar o bot.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // Item 26: qualquer alteracao de configuracao gera um registro de
    // auditoria (quem, o que, quando). "ver" e apenas leitura, nao audita.
    if (sub !== 'ver') {
      auditLog.record(interaction.user.id, `config.${sub}`, { guildId }, 'ok');
    }

    if (sub === 'ver') {
      const cfg = getGuildConfig(guildId);
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuracao do servidor')
        .setColor('#5865F2')
        .addFields(
          { name: 'Canal de logs', value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Nao definido', inline: true },
          { name: 'Boas-vindas', value: cfg.welcomeChannelId ? `<#${cfg.welcomeChannelId}>` : 'Nao definido', inline: true },
          { name: 'Despedida', value: cfg.leaveChannelId ? `<#${cfg.leaveChannelId}>` : 'Nao definido', inline: true },
          { name: 'IA ativada', value: cfg.aiEnabled ? 'Sim' : 'Nao', inline: true },
          { name: 'Canal de IA', value: cfg.aiChannelId ? `<#${cfg.aiChannelId}>` : 'Todos os canais', inline: true },
          { name: 'Mensagens de contexto', value: String(cfg.contextMessageLimit), inline: true },
          { name: 'Moderacao ativada', value: cfg.moderationEnabled ? 'Sim' : 'Nao', inline: true },
          { name: 'XP ativado', value: cfg.xpEnabled ? 'Sim' : 'Nao', inline: true },
          { name: 'Economia ativada', value: cfg.economyEnabled ? 'Sim' : 'Nao', inline: true }
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'canal-logs') {
      const channel = interaction.options.getChannel('canal');
      setGuildConfig(guildId, { logChannelId: channel.id });
      await interaction.reply(`✅ Canal de logs definido para ${channel}.`);
      return;
    }
    if (sub === 'canal-boas-vindas') {
      const channel = interaction.options.getChannel('canal');
      setGuildConfig(guildId, { welcomeChannelId: channel.id });
      await interaction.reply(`✅ Canal de boas-vindas definido para ${channel}.`);
      return;
    }
    if (sub === 'canal-despedida') {
      const channel = interaction.options.getChannel('canal');
      setGuildConfig(guildId, { leaveChannelId: channel.id });
      await interaction.reply(`✅ Canal de despedida definido para ${channel}.`);
      return;
    }
    if (sub === 'canal-ia') {
      const channel = interaction.options.getChannel('canal');
      setGuildConfig(guildId, { aiChannelId: channel ? channel.id : null });
      await interaction.reply(channel ? `✅ A IA agora responde apenas em ${channel}.` : '✅ A IA agora pode responder em qualquer canal permitido.');
      return;
    }
    if (sub === 'ia-ativada') {
      const value = interaction.options.getBoolean('valor');
      setGuildConfig(guildId, { aiEnabled: value });
      await interaction.reply(`✅ IA ${value ? 'ativada' : 'desativada'} para este servidor.`);
      return;
    }
    if (sub === 'cargo-admin') {
      const role = interaction.options.getRole('cargo');
      const cfg = getGuildConfig(guildId);
      const roles = Array.from(new Set([...cfg.adminRoles, role.id]));
      setGuildConfig(guildId, { adminRoles: roles });
      await interaction.reply(`✅ Cargo ${role} agora tem permissao administrativa no bot.`);
      return;
    }
    if (sub === 'cargo-moderador') {
      const role = interaction.options.getRole('cargo');
      const cfg = getGuildConfig(guildId);
      const roles = Array.from(new Set([...cfg.moderatorRoles, role.id]));
      setGuildConfig(guildId, { moderatorRoles: roles });
      await interaction.reply(`✅ Cargo ${role} agora tem permissao de moderacao no bot.`);
      return;
    }
    if (sub === 'canal-silencioso') {
      const channel = interaction.options.getChannel('canal');
      const cfg = getGuildConfig(guildId);
      const channels = Array.from(new Set([...cfg.silentChannels, channel.id]));
      setGuildConfig(guildId, { silentChannels: channels });
      await interaction.reply(`✅ A IA nao respondera mais em ${channel}.`);
      return;
    }
    if (sub === 'contexto') {
      const amount = interaction.options.getInteger('quantidade');
      setGuildConfig(guildId, { contextMessageLimit: amount });
      await interaction.reply(`✅ Limite de contexto definido para ${amount} mensagens.`);
      return;
    }
  }
};
