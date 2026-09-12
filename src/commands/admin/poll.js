'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Cria uma enquete com reacoes.')
    .addStringOption((o) => o.setName('pergunta').setDescription('Pergunta da enquete').setRequired(true))
    .addStringOption((o) => o.setName('opcoes').setDescription('Opcoes separadas por ";" (max 5). Vazio = sim/nao').setRequired(false)),
  async execute(interaction) {
    const question = interaction.options.getString('pergunta');
    const optionsRaw = interaction.options.getString('opcoes');

    const embed = new EmbedBuilder().setTitle('📊 Enquete').setDescription(question).setColor('#5865F2').setFooter({ text: `Criada por ${interaction.user.tag}` });

    if (!optionsRaw) {
      const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
      await msg.react('👍');
      await msg.react('👎');
      return;
    }

    const options = optionsRaw.split(';').map((o) => o.trim()).filter(Boolean).slice(0, 5);
    embed.addFields({ name: 'Opcoes', value: options.map((o, i) => `${NUMBER_EMOJIS[i]} ${o}`).join('\n') });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < options.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await msg.react(NUMBER_EMOJIS[i]);
    }
  }
};
