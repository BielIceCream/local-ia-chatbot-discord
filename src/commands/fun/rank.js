'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const xpManager = require('../../xp/xpManager');
const { getGuildConfig } = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra seu nivel e XP.')
    .addUserOption((o) => o.setName('usuario').setDescription('Usuario alvo').setRequired(false)),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.xpEnabled) {
      await interaction.reply({ content: 'O sistema de XP esta desativado neste servidor.', ephemeral: true });
      return;
    }
    const user = interaction.options.getUser('usuario') || interaction.user;
    const rank = xpManager.getRank(interaction.guild.id, user.id);
    const nextLevelXp = Math.round(xpManager.xpForNextLevel(rank.level));

    const embed = new EmbedBuilder()
      .setTitle(`⭐ Nivel de ${user.username}`)
      .addFields(
        { name: 'Nivel', value: String(rank.level), inline: true },
        { name: 'XP', value: `${rank.xp} / ${nextLevelXp}`, inline: true }
      )
      .setColor('#5865F2')
      .setThumbnail(user.displayAvatarURL());
    await interaction.reply({ embeds: [embed] });
  }
};
