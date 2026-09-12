'use strict';

// Duas camadas de memoria persistente, deliberadamente SEPARADAS (item 10):
//
// 1) Memoria do SISTEMA/administrativa: fatos que um administrador decide
//    guardar explicitamente via /ai-config lembrar. Alta confianca, nunca
//    expira sozinha, tratada como config do servidor.
//
// 2) Memoria comum dos USUARIOS ("fatos memoraveis", item 1): observada
//    automaticamente a partir de padroes simples de mensagens (nao de
//    qualquer mensagem - so quando bate um padrao especifico de preferencia/
//    interesse/fato). Tem confianca, categoria, e pode expirar.
//
// Ambas sao tratadas como DADOS ao montar o prompt (item 11) - nunca como
// instrucoes que a IA deva obedecer.
const memoryDb = require('../database/memory');
const longTermMemory = require('../database/longTermMemory');

// ---- Memoria do sistema (administrativa) ----

function remember(guildId, key, value) {
  memoryDb.set(guildId, key, value);
}

function recall(guildId, key) {
  return memoryDb.get(guildId, key);
}

function forget(guildId, key) {
  return memoryDb.remove(guildId, key);
}

function listMemories(guildId) {
  return memoryDb.list(guildId);
}

function summarizeForPrompt(guildId, maxItems = 8) {
  const items = listMemories(guildId).slice(0, maxItems);
  if (items.length === 0) return '';
  return items.map((i) => `- ${i.key}: ${i.value}`).join('\n');
}

// ---- Memoria comum dos usuarios (fatos memoraveis, item 1) ----

// Padroes conservadores: so vira fato memoravel quando a mensagem CLARAMENTE
// declara uma preferencia/interesse/fato sobre quem escreveu. Mensagens
// comuns do dia a dia nunca batem aqui - por design, para nao "salvar
// automaticamente tudo que for dito" (regra explicita do item 1).
const FACT_PATTERNS = [
  { regex: /\bmeu\s+(?:jogo|filme|time|clube|anime|livro)\s+favorito\s+(?:e|é)\s+(.{2,60})/i, category: 'preferencia', confidence: 0.7 },
  { regex: /\beu\s+(?:gosto|amo|curto)\s+(?:muito\s+)?de\s+(.{2,60})/i, category: 'interesse', confidence: 0.6 },
  { regex: /\beu\s+(?:odeio|detesto|nao\s+gosto\s+de)\s+(.{2,60})/i, category: 'preferencia', confidence: 0.6 },
  { regex: /\beu\s+(?:sou|trabalho como|estudo)\s+(.{2,60})/i, category: 'fato_pessoal', confidence: 0.6 },
  { regex: /\bmeu\s+anivers[aá]rio\s+(?:e|é)\s+(.{2,30})/i, category: 'fato_pessoal', confidence: 0.8 },
  { regex: /\beu\s+moro\s+em\s+(.{2,40})/i, category: 'fato_pessoal', confidence: 0.6 }
];

/**
 * Analisa uma mensagem e salva um fato memoravel SOMENTE se ela bater em um
 * dos padroes acima. Retorna o fato salvo (ou null se nada relevante).
 */
function extractAndRememberFact(guildId, userId, content) {
  for (const pattern of FACT_PATTERNS) {
    const match = content.match(pattern.regex);
    if (match) {
      const id = longTermMemory.rememberFact({
        guildId, userId,
        content: content.slice(0, 200),
        category: pattern.category,
        confidence: pattern.confidence
      });
      return { id, category: pattern.category };
    }
  }
  return null;
}

function findRelevantFacts(guildId, userId, text, limit = 3) {
  return longTermMemory.findRelevantFacts(guildId, userId, text, limit);
}

function listFacts(guildId, userId) {
  return longTermMemory.listFacts(guildId, userId);
}

function forgetFact(guildId, factId) {
  return longTermMemory.forgetFact(guildId, factId);
}

function forgetAllFactsForUser(guildId, userId) {
  return longTermMemory.forgetAllForUser(guildId, userId);
}

module.exports = {
  remember, recall, forget, listMemories, summarizeForPrompt,
  extractAndRememberFact, findRelevantFacts, listFacts, forgetFact, forgetAllFactsForUser
};
