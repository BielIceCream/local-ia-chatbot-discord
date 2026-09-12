'use strict';

// Controle de gasto mensal (item 22): teto rigido configuravel para o
// provider pago (Groq). Quando o consumo estimado atinge o teto, novas
// chamadas ao provider pago sao bloqueadas ate o proximo ciclo mensal - o
// bot cai automaticamente para o proximo fallback (algoritmo), sem parar.
const { state, scheduleSave } = require('../database/database');
const { global: globalConfig } = require('../config/config');
const logger = require('../utils/logger');

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ensureUsageRecord(provider) {
  const monthKey = currentMonthKey();
  if (!state.tokenUsage[provider] || state.tokenUsage[provider].month !== monthKey) {
    state.tokenUsage[provider] = { month: monthKey, promptTokens: 0, completionTokens: 0, estimatedCostBRL: 0, calls: 0 };
    scheduleSave();
  }
  return state.tokenUsage[provider];
}

function getProviderPricing(provider) {
  return (globalConfig.spending && globalConfig.spending[provider]) || {
    pricePerMillionInputUSD: 0,
    pricePerMillionOutputUSD: 0,
    usdToBrlRate: 5.5,
    monthlyLimitBRL: 0
  };
}

function estimateCostBRL(provider, promptTokens, completionTokens) {
  const pricing = getProviderPricing(provider);
  const inputCost = (promptTokens / 1_000_000) * pricing.pricePerMillionInputUSD;
  const outputCost = (completionTokens / 1_000_000) * pricing.pricePerMillionOutputUSD;
  return (inputCost + outputCost) * pricing.usdToBrlRate;
}

/**
 * true se ainda ha orcamento disponivel para este provider neste mes,
 * respeitando uma margem de seguranca (evita estourar o teto por pequenas
 * diferencas entre estimativa e cobrança real - item 22).
 */
function canSpend(provider) {
  const pricing = getProviderPricing(provider);
  if (!pricing.monthlyLimitBRL || pricing.monthlyLimitBRL <= 0) return false; // sem teto configurado = desativado por seguranca
  const usage = ensureUsageRecord(provider);
  const safetyMargin = pricing.monthlyLimitBRL * 0.9;
  return usage.estimatedCostBRL < safetyMargin;
}

function recordUsage(provider, promptTokens, completionTokens) {
  const usage = ensureUsageRecord(provider);
  const cost = estimateCostBRL(provider, promptTokens, completionTokens);
  usage.promptTokens += promptTokens;
  usage.completionTokens += completionTokens;
  usage.estimatedCostBRL += cost;
  usage.calls += 1;
  scheduleSave();

  const pricing = getProviderPricing(provider);
  if (pricing.monthlyLimitBRL > 0 && usage.estimatedCostBRL >= pricing.monthlyLimitBRL * 0.9) {
    logger.warn(`Gasto estimado com "${provider}" este mes: R$${usage.estimatedCostBRL.toFixed(4)} (teto: R$${pricing.monthlyLimitBRL}).`, 'spendGuard');
  }
  return usage;
}

function getUsage(provider) {
  return ensureUsageRecord(provider);
}

module.exports = { canSpend, recordUsage, getUsage, estimateCostBRL, currentMonthKey };
