'use strict';

const { safe } = require('../errors/errorHandler');

// Placeholder para logs de voz (entrar/sair/mover de canal de voz).
// Mantido simples e seguro por padrao; pode ser expandido conforme necessidade.
module.exports = {
  name: 'voiceStateUpdate',
  execute: safe(async function execute(oldState, newState, client) {
    // Nao faz nada por padrao - reservado para futuras extensoes
    // (ex: logs de voz, contagem de tempo em call, cargo automatico ao entrar em call).
  }, 'voiceStateUpdate')
};
