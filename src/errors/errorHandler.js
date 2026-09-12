'use strict';

const logger = require('../utils/logger');

/**
 * Envolve um handler assincrono garantindo que erros nunca derrubem o processo.
 * Uso: safe(async (...) => { ... }, 'AI')
 */
function safe(fn, scope) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      logger.error(err, scope || 'unknown');
      return null;
    }
  };
}

function setupGlobalHandlers(client) {
  process.on('unhandledRejection', (reason) => {
    logger.error(reason instanceof Error ? reason : new Error(String(reason)), 'unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error(err, 'uncaughtException');
    // Nao derruba o processo: apenas registra. Erros criticos de inicializacao
    // ainda encerram o processo explicitamente em index.js quando necessario.
  });

  if (client) {
    client.on('error', (err) => logger.error(err, 'discord.js client'));
    client.on('shardError', (err) => logger.error(err, 'discord.js shard'));
    client.rest.on('rateLimited', (info) => {
      logger.warn(`Rate limited: rota=${info.route} tempo=${info.timeToReset}ms`, 'rateLimit');
    });
  }
}

/**
 * Traduz erros comuns do Discord API em mensagens amigaveis.
 */
function friendlyDiscordError(err) {
  const code = err && err.code;
  const map = {
    10003: 'Canal nao encontrado (pode ter sido deletado).',
    10007: 'Membro nao encontrado (pode ter saido do servidor).',
    10011: 'Cargo nao encontrado (pode ter sido deletado).',
    50001: 'O bot nao tem acesso a este recurso.',
    50013: 'O bot nao tem permissao suficiente para executar esta acao.',
    50035: 'Dados invalidos enviados ao Discord.',
    50007: 'Nao foi possivel enviar mensagem direta para este usuario.'
  };
  return map[code] || 'Ocorreu um erro inesperado ao comunicar com o Discord.';
}

module.exports = { safe, setupGlobalHandlers, friendlyDiscordError };
