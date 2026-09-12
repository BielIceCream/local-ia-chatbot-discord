'use strict';

// "Fatos memoraveis" (item 1 e 10 do roadmap): memoria comum dos usuarios,
// SEPARADA da memoria administrativa/do sistema (essa fica em memory.js).
// Cada fato tem: usuario relacionado, conteudo, categoria, confianca,
// timestamps de criacao/atualizacao/ultimo uso, e expiracao opcional.
const { state, nextId, scheduleSave } = require('./database');

const VALID_CATEGORIES = ['preferencia', 'interesse', 'fato_grupo', 'fato_pessoal', 'outro'];
const DEFAULT_TTL_DAYS = 180; // fatos de baixa confianca expiram; alta confianca pode ser permanente (ttlDays: null)

function now() { return Date.now(); }

/**
 * Cria ou atualiza um fato. Se ja existir um fato do mesmo usuario+categoria
 * com conteudo semelhante (mesma chave normalizada), ele e ATUALIZADO em vez
 * de duplicado - permite que uma informacao nova substitua uma antiga que a
 * contradiga (item 10: "permitir atualizacao quando uma informacao nova
 * contradizer a antiga").
 */
function rememberFact({ guildId, userId, content, category, confidence, ttlDays }) {
  const cat = VALID_CATEGORIES.includes(category) ? category : 'outro';
  const conf = Math.max(0, Math.min(1, typeof confidence === 'number' ? confidence : 0.5));
  const ttl = ttlDays === null ? null : (ttlDays || DEFAULT_TTL_DAYS);
  const expiresAt = ttl === null ? null : now() + ttl * 86400000;

  const existing = state.longTermFacts.find(
    (f) => f.guild_id === guildId && f.user_id === userId && f.category === cat
      && f.content.toLowerCase().slice(0, 30) === content.toLowerCase().slice(0, 30)
  );

  if (existing) {
    existing.content = content;
    existing.confidence = conf;
    existing.updated_at = now();
    existing.expires_at = expiresAt;
    scheduleSave();
    return existing.id;
  }

  const id = nextId('longTermFacts');
  state.longTermFacts.push({
    id, guild_id: guildId, user_id: userId, content, category: cat,
    confidence: conf, created_at: now(), updated_at: now(), last_used_at: null, expires_at: expiresAt
  });
  scheduleSave();
  return id;
}

function pruneExpired() {
  const before = state.longTermFacts.length;
  const t = now();
  state.longTermFacts = state.longTermFacts.filter((f) => !f.expires_at || f.expires_at > t);
  const removed = before - state.longTermFacts.length;
  if (removed > 0) scheduleSave();
  return removed;
}

function listFacts(guildId, userId) {
  pruneExpired();
  return state.longTermFacts
    .filter((f) => f.guild_id === guildId && (!userId || f.user_id === userId))
    .sort((a, b) => b.confidence - a.confidence || b.updated_at - a.updated_at);
}

/**
 * Busca fatos relevantes para um texto (casamento simples por palavra-chave
 * no conteudo do fato), marcando "last_used_at" nos que forem retornados -
 * usado para nao levar fatos irrelevantes pro prompt (item 6).
 */
function findRelevantFacts(guildId, userId, text, limit = 3) {
  pruneExpired();
  const lower = (text || '').toLowerCase();
  const candidates = state.longTermFacts.filter((f) => f.guild_id === guildId && (!userId || f.user_id === userId));

  const scored = candidates
    .map((f) => {
      const words = f.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const hits = words.filter((w) => lower.includes(w)).length;
      return { fact: f, hits };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits || b.fact.confidence - a.fact.confidence)
    .slice(0, limit);

  scored.forEach((s) => { s.fact.last_used_at = now(); });
  if (scored.length > 0) scheduleSave();
  return scored.map((s) => s.fact);
}

function forgetFact(guildId, factId) {
  const before = state.longTermFacts.length;
  state.longTermFacts = state.longTermFacts.filter((f) => !(f.id === factId && f.guild_id === guildId));
  const removed = before - state.longTermFacts.length;
  if (removed > 0) scheduleSave();
  return removed;
}

function forgetAllForUser(guildId, userId) {
  const before = state.longTermFacts.length;
  state.longTermFacts = state.longTermFacts.filter((f) => !(f.guild_id === guildId && f.user_id === userId));
  const removed = before - state.longTermFacts.length;
  if (removed > 0) scheduleSave();
  return removed;
}

module.exports = { rememberFact, listFacts, findRelevantFacts, forgetFact, forgetAllForUser, pruneExpired, VALID_CATEGORIES };
