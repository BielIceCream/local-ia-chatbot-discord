'use strict';

// Provider "sem IA": usado como ultimo fallback caso todos os outros
// providers (algorithm, ollama) estejam indisponiveis por algum motivo.
// Nunca chama servicos externos e nunca gera texto real - garante apenas que
// o restante do bot continue funcionando normalmente.
async function isAvailable() {
  return true;
}

async function generate() {
  return null; // sinaliza ao aiManager que nao ha resposta de IA disponivel
}

module.exports = { name: 'local-disabled', isAvailable, generate };
