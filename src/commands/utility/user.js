'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('Mostra informacoes sobre um usuario.')
    .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario alvo').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    const embed = new EmbedBuilder()
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Conta criada em', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true }
      )
      .setColor('#5865F2');
    if (member) {
      embed.addFields(
        { name: 'Entrou no servidor em', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
        { name: 'Cargos', value: member.roles.cache.filter((r) => r.id !== interaction.guild.id).map((r) => `${r}`).join(', ') || 'Nenhum' }
      );
    }
    await interaction.reply({ embeds: [embed] });
  }
};
