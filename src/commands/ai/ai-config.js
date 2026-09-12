'use strict';
const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../config/config');
const { canManageServer } = require('../../moderation/permissions');
const memoryManager = require('../../ai/memoryManager');
const auditLog = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-config')
    .setDescription('Configura a personalidade e a memoria da IA.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand((sub) => sub
      .setName('personalidade')
      .setDescription('Define a personalidade da IA neste servidor')
      .addStringOption((o) => o.setName('texto').setDescription('Descricao da personalidade').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('tom')
      .setDescription('Define o tom da IA')
      .addStringOption((o) => o.setName('valor').setDescription('Ex: casual, formal, engracado').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('formalidade')
      .setDescription('Define o nivel de formalidade')
      .addStringOption((o) => o.setName('valor').setDescription('Ex: informal, neutro, formal').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('humor')
      .setDescription('Define o nivel de humor')
      .addStringOption((o) => o.setName('valor').setDescription('Ex: nenhum, moderado, alto').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('lembrar')
      .setDescription('Adiciona uma informacao administrativa permanente sobre o servidor para a IA')
      .addStringOption((o) => o.setName('chave').setDescription('Nome curto da informacao').setRequired(true))
      .addStringOption((o) => o.setName('valor').setDescription('Conteudo da informacao').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('esquecer')
      .setDescription('Remove uma informacao administrativa permanente')
      .addStringOption((o) => o.setName('chave').setDescription('Nome da informacao a remover').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('fatos')
      .setDescription('Lista os fatos memoraveis observados sobre um usuario')
      .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('esquecer-fatos')
      .setDescription('Apaga todos os fatos memoraveis observados sobre um usuario')
      .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(true))),
  async execute(interaction) {
    if (!canManageServer(interaction.member)) {
      await interaction.reply({ content: '❌ Voce nao tem permissao para configurar a IA.', ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const actorId = interaction.user.id;

    if (sub === 'personalidade') {
      const text = interaction.options.getString('texto');
      setGuildConfig(guildId, { aiPersonality: text });
      auditLog.record(actorId, 'ai-config.personalidade', { guildId }, 'ok');
      await interaction.reply('✅ Personalidade da IA atualizada.');
      return;
    }
    if (sub === 'tom') {
      setGuildConfig(guildId, { aiTone: interaction.options.getString('valor') });
      auditLog.record(actorId, 'ai-config.tom', { guildId }, 'ok');
      await interaction.reply('✅ Tom da IA atualizado.');
      return;
    }
    if (sub === 'formalidade') {
      setGuildConfig(guildId, { aiFormality: interaction.options.getString('valor') });
      auditLog.record(actorId, 'ai-config.formalidade', { guildId }, 'ok');
      await interaction.reply('✅ Formalidade da IA atualizada.');
      return;
    }
    if (sub === 'humor') {
      setGuildConfig(guildId, { aiHumor: interaction.options.getString('valor') });
      auditLog.record(actorId, 'ai-config.humor', { guildId }, 'ok');
      await interaction.reply('✅ Nivel de humor da IA atualizado.');
      return;
    }
    if (sub === 'lembrar') {
      const key = interaction.options.getString('chave');
      const value = interaction.options.getString('valor');
      memoryManager.remember(guildId, key, value);
      auditLog.record(actorId, 'ai-config.lembrar', { guildId, key }, 'ok');
      await interaction.reply(`✅ Informacao "${key}" salva na memoria administrativa do servidor.`);
      return;
    }
    if (sub === 'esquecer') {
      const key = interaction.options.getString('chave');
      const removed = memoryManager.forget(guildId, key);
      auditLog.record(actorId, 'ai-config.esquecer', { guildId, key }, removed ? 'ok' : 'not_found');
      await interaction.reply(removed ? `✅ Informacao "${key}" removida.` : `❌ Nenhuma informacao encontrada com a chave "${key}".`);
      return;
    }
    if (sub === 'fatos') {
      const user = interaction.options.getUser('usuario');
      const facts = memoryManager.listFacts(guildId, user.id);
      if (facts.length === 0) {
        await interaction.reply({ content: `Nenhum fato memoravel observado sobre ${user.username} ainda.`, ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle(`Fatos memoraveis sobre ${user.username}`)
        .setColor('#5865F2')
        .setDescription(facts.map((f) => `**#${f.id}** [${f.category}, confianca ${Math.round(f.confidence * 100)}%] ${f.content}`).join('\n\n'));
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    if (sub === 'esquecer-fatos') {
      const user = interaction.options.getUser('usuario');
      const removed = memoryManager.forgetAllFactsForUser(guildId, user.id);
      auditLog.record(actorId, 'ai-config.esquecer-fatos', { guildId, targetUserId: user.id, removed }, 'ok');
      await interaction.reply(`🧹 ${removed} fato(s) memoravel(is) sobre ${user.username} removido(s).`);
      return;
    }
  }
};
