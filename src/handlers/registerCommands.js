'use strict';

// Script standalone para registrar/atualizar os slash commands na API do
// Discord. Rode com `npm run register` sempre que adicionar/alterar comandos.
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./commandHandler');
const logger = require('../utils/logger');

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const devGuildId = process.env.DEV_GUILD_ID;

  if (!token || !clientId) {
    logger.error('DISCORD_TOKEN e CLIENT_ID sao obrigatorios no .env para registrar comandos.', 'registerCommands');
    process.exit(1);
  }

  const commands = loadCommands();
  const body = [...commands.values()].map((c) => c.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (devGuildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, devGuildId), { body });
      logger.info(`${body.length} comandos registrados instantaneamente na guild de desenvolvimento ${devGuildId}.`, 'registerCommands');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      logger.info(`${body.length} comandos globais registrados (pode levar ate 1h para propagar).`, 'registerCommands');
    }
  } catch (err) {
    logger.error(err, 'registerCommands');
    process.exit(1);
  }
}

main();
