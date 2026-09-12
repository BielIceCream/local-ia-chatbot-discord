'use strict';

const logger = require('../utils/logger');
const { healthCheck } = require('../database/database');
const aiManager = require('../ai/aiManager');

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function checkHealth(client) {
  const results = {};

  results.discord = client.ws.status === 0; // WS.Status.Ready
  results.database = healthCheck();
  results.ai = await aiManager.isAiAvailable();
  const mem = process.memoryUsage();
  results.memory = mem.heapUsed < mem.heapTotal * 0.95;
  results.eventLoop = true; // se este codigo esta rodando, o loop nao esta travado

  const failed = Object.entries(results).filter(([, ok]) => !ok).map(([k]) => k);
  if (failed.length > 0) {
    logger.warn(`Health check com falhas: ${failed.join(', ')}`, 'healthService');
  } else {
    logger.debug('Health check OK.', 'healthService');
  }
  return results;
}

function start(client) {
  setInterval(() => checkHealth(client), CHECK_INTERVAL_MS).unref();
  logger.info('Monitor de saude iniciado.', 'healthService');
}

module.exports = { start, checkHealth };
