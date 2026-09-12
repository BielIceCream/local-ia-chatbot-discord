'use strict';

// Camada de persistencia LEVE, sem dependencias nativas (nada de
// better-sqlite3/node-gyp) e sem servidor de banco separado. Ideal para
// hospedagens com pouca RAM (ex: Discloud, plano de 100MB): o estado inteiro
// fica em memoria (poucos KB para um bot tipico) e e salvo em um unico
// arquivo JSON de forma "debounced" (agrupada), evitando gravacoes excessivas
// em disco.
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { ROOT } = require('../config/config');
const { encrypt, decrypt, isEncryptionEnabled } = require('../utils/crypto');

const DATA_DIR = path.join(ROOT, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'bot.json');

const DEFAULT_STATE = {
  warnings: [],
  economy: {},
  xp: {},
  afk: {},
  tickets: [],
  suggestions: [],
  memory: {},        // fatos definidos por administradores (/ai-config lembrar) - "memoria do sistema"
  longTermFacts: [],  // fatos observados sobre usuarios (item 1/10) - "memoria comum dos usuarios"
  reminders: [],
  commandStats: {},
  botStats: {},
  tokenUsage: {},      // consumo/estimativa de custo por provider externo (item 6, 22)
  nextIds: { warnings: 1, tickets: 1, suggestions: 1, reminders: 1, longTermFacts: 1 }
};

function loadState() {
  if (!fs.existsSync(DB_PATH)) {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
    fs.writeFileSync(DB_PATH, encrypt(Buffer.from(JSON.stringify(fresh))));
    return fresh;
  }

  let raw;
  try {
    raw = decrypt(fs.readFileSync(DB_PATH));
  } catch (err) {
    // Erro de decriptacao (chave ausente/errada) e FATAL: nunca seguimos em
    // frente com um estado vazio aqui, pois a proxima gravacao sobrescreveria
    // o arquivo criptografado original com um estado "resetado" - perda real
    // de dados. Melhor parar o processo com uma mensagem clara.
    logger.error(err, 'database');
    logger.error('Encerrando: nao e possivel carregar o banco sem a chave de criptografia correta.', 'database');
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(raw.toString('utf8'));
    return {
      ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
      ...parsed,
      nextIds: { ...DEFAULT_STATE.nextIds, ...(parsed.nextIds || {}) }
    };
  } catch (err) {
    logger.error(err, 'database');
    logger.warn('Arquivo de dados corrompido ou ilegivel - iniciando com estado vazio. O arquivo original nao foi apagado.', 'database');
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

const state = loadState();

let saveTimer = null;
let dirty = false;

function flush() {
  if (!dirty) return;
  try {
    fs.writeFileSync(DB_PATH, encrypt(Buffer.from(JSON.stringify(state))));
    dirty = false;
  } catch (err) {
    logger.error(err, 'database.save');
  }
}

function scheduleSave() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flush();
  }, 2000);
  saveTimer.unref();
}

function nextId(collection) {
  const id = state.nextIds[collection] || 1;
  state.nextIds[collection] = id + 1;
  scheduleSave();
  return id;
}

function healthCheck() {
  return typeof state === 'object' && state !== null;
}

function incrementCommandUse(name) {
  state.commandStats[name] = (state.commandStats[name] || 0) + 1;
  scheduleSave();
}

function getTotalCommandUses() {
  return Object.values(state.commandStats).reduce((a, b) => a + b, 0);
}

function incrementBotStat(key, amount = 1) {
  state.botStats[key] = (state.botStats[key] || 0) + amount;
  scheduleSave();
}

function backup(destDir) {
  const dir = destDir || path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `backup-${Date.now()}.json`);
  // Backups usam a mesma criptografia do banco principal (item 13: "fazer
  // backup automatico" + "criptografar tambem os backups").
  fs.writeFileSync(dest, encrypt(Buffer.from(JSON.stringify(state))));
  pruneOldBackups(dir);
  logger.info(`Backup criado: ${dest}`, 'database');
  return dest;
}

const MAX_BACKUPS = 10; // mantem mais de uma versao (item 13), mas com um teto razoavel

function pruneOldBackups(dir) {
  try {
    const files = fs.readdirSync(dir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .map((f) => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    for (const old of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(dir, old.name));
    }
  } catch (err) {
    logger.warn(`Nao foi possivel limpar backups antigos: ${err.message}`, 'database');
  }
}

/**
 * Testa se um backup pode realmente ser restaurado (decripta + faz parse),
 * sem sobrescrever o estado atual. Usado por /backup verificar e pelo
 * processo de restauracao para validar antes de aplicar.
 */
function verifyBackup(backupPath) {
  try {
    const raw = decrypt(fs.readFileSync(backupPath));
    JSON.parse(raw.toString('utf8'));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// Garante que nada se perca ao encerrar o processo (ex: redeploy/restart).
process.on('exit', flush);
process.on('SIGINT', () => { flush(); process.exit(0); });
process.on('SIGTERM', () => { flush(); process.exit(0); });

logger.info(`Banco de dados (JSON leve) pronto em ${DB_PATH}`, 'database');

module.exports = {
  state,
  nextId,
  scheduleSave,
  healthCheck,
  incrementCommandUse,
  getTotalCommandUses,
  incrementBotStat,
  backup,
  verifyBackup,
  isEncryptionEnabled,
  DB_PATH
};
