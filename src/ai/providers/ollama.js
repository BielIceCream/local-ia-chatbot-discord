'use strict';

// Provider local via Ollama (https://ollama.com). Nao requer nenhuma API key
// de servico externo - roda inteiramente na maquina/servidor do usuario.
// ATENCAO: um modelo de linguagem local via Ollama exige varios GB de RAM,
// incompativel com hospedagens de baixo custo como o plano de 100MB da
// Discloud. Pensado para uso em VPS/servidor proprio (ex: Oracle Cloud).
const logger = require('../../utils/logger');
const promptBuilder = require('../promptBuilder');
const { createCircuitBreaker } = require('../circuitBreaker');
const { global: globalConfig } = require('../../config/config');

const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const REQUEST_TIMEOUT_MS = 15000; // item 18: nunca deixar o bot preso esperando a IA

const breaker = createCircuitBreaker('ollama', { failureThreshold: 3, cooldownMs: 60000 });

let availabilityCache = { checkedAt: 0, available: false };
const AVAILABILITY_TTL_MS = 30000;

async function checkReachable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function isAvailable(forceCheck = false) {
  if (breaker.isOpen()) return false; // item 18: circuito aberto - nem tenta

  const now = Date.now();
  if (!forceCheck && now - availabilityCache.checkedAt < AVAILABILITY_TTL_MS) {
    return availabilityCache.available;
  }
  const ok = await checkReachable();
  availabilityCache = { checkedAt: now, available: ok };
  return ok;
}

async function generate({ guildId, userId, message, botDisplayName, history }) {
  if (!(await isAvailable())) return null;

  const startedAt = Date.now();
  const systemPrompt = promptBuilder.buildSystemPrompt({ guildId, botDisplayName });
  const userPrompt = promptBuilder.buildUserPrompt({
    guildId, userId, history: history || [], botDisplayName, currentMessage: message, authorName: 'usuario'
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        options: { temperature: globalConfig.ai.temperature, num_predict: 300 },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    clearTimeout(timeout);

    if (!res.ok) {
      breaker.recordFailure();
      logger.warn(`Ollama respondeu com status ${res.status}`, 'ai/ollama');
      return null;
    }

    const data = await res.json();
    breaker.recordSuccess();
    logger.debug(`Ollama respondeu em ${Date.now() - startedAt}ms`, 'ai/ollama');

    const content = data && data.message && data.message.content;
    return content ? content.trim() : null;
  } catch (err) {
    breaker.recordFailure();
    logger.warn(`Falha ao gerar resposta via Ollama: ${err.message}`, 'ai/ollama');
    return null;
  }
}

function getCircuitState() {
  return breaker.getState();
}

module.exports = { name: 'ollama', isAvailable, generate, getCircuitState };
