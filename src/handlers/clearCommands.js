'use strict';

// Script standalone para LIMPAR slash commands registrados no Discord.
// Util quando comandos antigos/duplicados continuam aparecendo depois de
// renomear, remover, ou trocar entre registro global e por servidor.
//
// Uso:
//   npm run clear-commands            -> limpa comandos GLOBAIS
//   npm run clear-commands -- --guild -> limpa comandos da guild em DEV_GUILD_ID
//   npm run clear-commands -- --all   -> limpa os dois (global e da guild, se definida)
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const devGuildId = process.env.DEV_GUILD_ID;

  if (!token || !clientId) {
    logger.error('DISCORD_TOKEN e CLIENT_ID sao obrigatorios no .env.', 'clearCommands');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const wantsGuild = args.includes('--guild') || args.includes('--all');
  const wantsGlobal = args.includes('--all') || (!args.includes('--guild'));

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (wantsGlobal) {
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      logger.info('Todos os comandos GLOBAIS foram removidos. Pode levar ate 1h para sumir em todos os servidores.', 'clearCommands');
    }

    if (wantsGuild) {
      if (!devGuildId) {
        logger.warn('--guild/--all pedido, mas DEV_GUILD_ID nao esta definido no .env - nada a limpar por guild.', 'clearCommands');
      } else {
        await rest.put(Routes.applicationGuildCommands(clientId, devGuildId), { body: [] });
        logger.info(`Todos os comandos da guild ${devGuildId} foram removidos (efeito imediato).`, 'clearCommands');
      }
    }

    logger.info('Rode "npm run register" para registrar os comandos atuais novamente.', 'clearCommands');
  } catch (err) {
    logger.error(err, 'clearCommands');
    process.exit(1);
  }
}

main();
