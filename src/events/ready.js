'use strict';

const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const { incrementBotStat } = require('../database/database');
const reminderService = require('../services/reminderService');
const healthService = require('../services/healthService');
const contextManager = require('../ai/contextManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Conectado como ${client.user.tag} (${client.guilds.cache.size} servidores)`, 'ready');
    client.user.setPresence({
      activities: [{ name: '/help | pronto para ajudar', type: ActivityType.Watching }],
      status: 'online'
    });

    incrementBotStat('starts', 1);

    contextManager.startCleanupLoop();
    reminderService.start(client);
    healthService.start(client);
  }
};
