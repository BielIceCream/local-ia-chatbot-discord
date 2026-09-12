'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('privacy').setDescription('Explica o que este bot armazena sobre voce e o servidor.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔒 Privacidade')
      .setColor('#5865F2')
      .setDescription([
        'Este bot segue uma politica conservadora de dados:',
        '',
        '**Armazenado localmente (banco SQLite no servidor onde o bot roda):**',
        '- Advertencias, XP, saldo de economia e tickets, associados ao seu ID de usuario.',
        '- Configuracoes definidas pelos administradores do servidor.',
        '- Informacoes que administradores decidem salvar explicitamente com `/ai-config lembrar`.',
        '',
        '**Memoria temporaria (nunca salva em disco):**',
        '- Um historico curto das ultimas mensagens de cada canal, usado apenas para a IA entender o contexto da conversa. Expira automaticamente apos um tempo definido em configuracao.',
        '',
        '**Nunca armazenado:**',
        '- Senhas, tokens ou credenciais de qualquer tipo.',
        '- O conteudo de todas as mensagens permanentemente.',
        '- Nenhum dado e enviado a servicos de IA externos - a IA roda localmente via Ollama.'
      ].join('\n'));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
