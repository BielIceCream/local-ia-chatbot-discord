'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiManager = require('../../ai/aiManager');
const contextManager = require('../../ai/contextManager');
const { getGuildConfig } = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Conversa diretamente com a IA local do bot.')
    .addStringOption((o) => o.setName('mensagem').setDescription('O que voce quer perguntar ou dizer').setRequired(true)),
  async execute(interaction) {
    const cfg = getGuildConfig(interaction.guild.id);
    if (!cfg.aiEnabled) {
      await interaction.reply({ content: 'A IA esta desativada neste servidor. Um administrador pode ativar com `/config ia-ativada`.', ephemeral: true });
      return;
    }

    await interaction.deferReply();
    const message = interaction.options.getString('mensagem');

    const reply = await aiManager.generate({
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      userId: interaction.user.id,
      message,
      botDisplayName: interaction.guild.members.me.displayName
    });

    if (!reply) {
      const embed = new EmbedBuilder()
        .setTitle('🤖 IA indisponivel')
        .setDescription('Nenhum modelo de IA local (Ollama) esta disponivel no momento, ou voce esta em cooldown. O restante do bot continua funcionando normalmente.')
        .setColor('#ED4245');
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    contextManager.addMessage(interaction.guild.id, interaction.channel.id, {
      authorId: interaction.user.id,
      authorName: interaction.member.displayName,
      content: message,
      isBot: false
    });
    contextManager.addMessage(interaction.guild.id, interaction.channel.id, {
      authorId: interaction.client.user.id,
      authorName: interaction.guild.members.me.displayName,
      content: reply,
      isBot: true
    });

    await interaction.editReply(reply);
  }
};
