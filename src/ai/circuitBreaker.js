'use strict';

// Circuit breaker generico (item 18): depois de N falhas seguidas de um
// provider, "abre o circuito" e para de tentar aquele provider por um
// periodo de cooldown, pulando direto para o proximo fallback em vez de
// gastar tempo/timeout tentando algo que provavelmente vai falhar de novo.
// Depois do cooldown, permite uma nova tentativa automaticamente ("meio-
// aberto"): se funcionar, fecha o circuito; se falhar, reabre.
const logger = require('../utils/logger');

function createCircuitBreaker(name, { failureThreshold = 3, cooldownMs = 60000 } = {}) {
  let failures = 0;
  let openedAt = 0;

  function isOpen() {
    if (failures < failureThreshold) return false;
    const elapsed = Date.now() - openedAt;
    if (elapsed > cooldownMs) return false; // janela de teste (meio-aberto)
    return true;
  }

  function recordSuccess() {
    if (failures > 0) logger.info(`Circuit breaker "${name}" fechado novamente apos sucesso.`, 'circuitBreaker');
    failures = 0;
    openedAt = 0;
  }

  function recordFailure() {
    failures += 1;
    if (failures === failureThreshold) {
      openedAt = Date.now();
      logger.warn(`Circuit breaker "${name}" ABERTO apos ${failures} falhas seguidas. Pausando por ${Math.round(cooldownMs / 1000)}s.`, 'circuitBreaker');
    } else if (failures > failureThreshold) {
      // falhou de novo durante a janela de teste - reabre o cooldown
      openedAt = Date.now();
    }
  }

  function getState() {
    return { name, failures, open: isOpen(), cooldownMs };
  }

  return { isOpen, recordSuccess, recordFailure, getState };
}

module.exports = { createCircuitBreaker };
