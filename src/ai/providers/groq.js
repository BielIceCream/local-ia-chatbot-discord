'use strict';

// Provider via Groq (https://groq.com) - usado como FALLBACK do Ollama
// (item 5, 19). Extremamente barato, mas ainda e um servico externo pago:
// por isso tem um teto de gasto mensal (spendGuard.js) que bloqueia novas
// chamadas quando atingido, caindo para o motor algoritmico automaticamente
// sem jamais interromper o bot (item 22).
const logger = require('../../utils/logger');
const promptBuilder = require('../promptBuilder');
const spendGuard = require('../spendGuard');
const { createCircuitBreaker } = require('../circuitBreaker');

const PROVIDER_KEY = 'groq';
const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 10000;

const breaker = createCircuitBreaker('groq', { failureThreshold: 3, cooldownMs: 120000 });

async function isAvailable() {
  if (!API_KEY) return false;
  if (breaker.isOpen()) return false;
  if (!spendGuard.canSpend(PROVIDER_KEY)) return false; // teto mensal atingido
  return true;
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
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    clearTimeout(timeout);

    if (!res.ok) {
      breaker.recordFailure();
      logger.warn(`Groq respondeu com status ${res.status}`, 'ai/groq');
      return null;
    }

    const data = await res.json();
    breaker.recordSuccess();
    logger.debug(`Groq respondeu em ${Date.now() - startedAt}ms`, 'ai/groq');

    const usage = data.usage || {};
    spendGuard.recordUsage(PROVIDER_KEY, usage.prompt_tokens || 0, usage.completion_tokens || 0);

    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return content ? content.trim() : null;
  } catch (err) {
    breaker.recordFailure();
    logger.warn(`Falha ao gerar resposta via Groq: ${err.message}`, 'ai/groq');
    return null;
  }
}

function getCircuitState() {
  return breaker.getState();
}

module.exports = { name: 'groq', isAvailable, generate, getCircuitState };
