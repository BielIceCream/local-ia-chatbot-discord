'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warningsDb = require('../../database/warnings');
const { canManageMembers } = require('../../moderation/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Lista as advertencias de um usuario.')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(true))
    .addBooleanOption((o) => o.setName('limpar').setDescription('Limpar todas as advertencias deste usuario').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const clear = interaction.options.getBoolean('limpar');

    if (clear) {
      if (!canManageMembers(interaction.member)) {
        await interaction.reply({ content: '❌ Voce nao tem permissao para limpar advertencias.', ephemeral: true });
        return;
      }
      const removed = warningsDb.clear(interaction.guild.id, target.id);
      await interaction.reply(`🧹 ${removed} advertencia(s) removida(s) de ${target}.`);
      return;
    }

    const list = warningsDb.list(interaction.guild.id, target.id);
    if (list.length === 0) {
      await interaction.reply(`${target} nao possui advertencias.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Advertencias de ${target.tag}`)
      .setColor('#FEE75C')
      .setDescription(list.map((w) => `**#${w.id}** - <t:${Math.floor(w.created_at / 1000)}:R> por <@${w.moderator_id}>\n> ${w.reason}`).join('\n\n'));

    await interaction.reply({ embeds: [embed] });
  }
};
