'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Carrega todos os comandos de src/commands/** de forma modular.
// Cada arquivo de comando exporta { data (SlashCommandBuilder), execute(interaction, ctx) }.
function loadCommands() {
  const commands = new Map();
  const commandsDir = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsDir).filter((f) => fs.statSync(path.join(commandsDir, f)).isDirectory());

  for (const category of categories) {
    const categoryDir = path.join(commandsDir, category);
    const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const command = require(path.join(categoryDir, file));
        if (!command || !command.data || !command.execute) {
          logger.warn(`Comando invalido ignorado: ${category}/${file}`, 'commandHandler');
          continue;
        }
        command.category = category;
        commands.set(command.data.name, command);
      } catch (err) {
        logger.error(err, `commandHandler:${category}/${file}`);
      }
    }
  }

  logger.info(`${commands.size} comandos carregados.`, 'commandHandler');
  return commands;
}

module.exports = { loadCommands };
