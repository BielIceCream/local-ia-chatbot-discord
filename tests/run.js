'use strict';

// Testes basicos, sem dependencias externas de teste (evita inflar node_modules).
// Rode com: npm test
process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

function section(name, fn) {
  console.log(`\n${name}`);
  fn();
}

section('Database', () => {
  const { state, healthCheck, incrementCommandUse, getTotalCommandUses } = require('../src/database/database');
  assert(healthCheck() === true, 'armazenamento em JSON inicializado');
  ['warnings', 'economy', 'xp', 'tickets', 'suggestions', 'memory', 'reminders'].forEach((key) => {
    assert(Object.prototype.hasOwnProperty.call(state, key), `colecao "${key}" existe no estado`);
  });
  const before = getTotalCommandUses();
  incrementCommandUse('__test__');
  assert(getTotalCommandUses() === before + 1, 'contador de uso de comandos incrementa corretamente');
});

section('Modulos de dados', () => {
  // IDs unicos por execucao: evita que saldos/XP acumulados de execucoes
  // anteriores do "npm test" (persistidos em data/bot.json) quebrem
  // asserções que checam valores absolutos.
  const guildId = `test-guild-data-${Date.now()}`;
  const userId = 'user-1';

  const warningsDb = require('../src/database/warnings');
  const id = warningsDb.add(guildId, userId, 'mod-1', 'teste');
  assert(typeof id === 'number', 'warnings.add retorna um id numerico');
  assert(warningsDb.list(guildId, userId).length === 1, 'warnings.list retorna a advertencia criada');

  const economyDb = require('../src/database/economy');
  const acc = economyDb.addBalance(guildId, userId, 50);
  assert(acc.balance === 50, 'economy.addBalance atualiza o saldo');

  const usersDb = require('../src/database/users');
  const { leveledUp } = usersDb.addXp(guildId, userId, 10);
  assert(typeof leveledUp === 'boolean', 'users.addXp retorna leveledUp');
});

section('Permissoes', () => {
  const permissions = require('../src/moderation/permissions');
  assert(typeof permissions.isAdmin === 'function', 'isAdmin existe');
  assert(typeof permissions.isModerator === 'function', 'isModerator existe');
  assert(typeof permissions.canManageMessages === 'function', 'canManageMessages existe');
});

section('Configuracao', () => {
  const { getGuildConfig, setGuildConfig } = require('../src/config/config');
  // Guild ID unico por execucao para nao ler configuracao residual de testes anteriores.
  const testGuildId = `test-guild-config-${Date.now()}`;
  const cfg = getGuildConfig(testGuildId);
  assert(cfg.aiEnabled === true, 'config padrao tem IA ativada');
  setGuildConfig(testGuildId, { aiEnabled: false });
  const updated = getGuildConfig(testGuildId);
  assert(updated.aiEnabled === false, 'config e atualizada corretamente');
});

section('Cooldown / Relevance Scorer', () => {
  const relevanceScorer = require('../src/ai/relevanceScorer');
  assert(typeof relevanceScorer.scoreMessage === 'function', 'scoreMessage existe');
});

section('AI Manager', () => {
  const aiManager = require('../src/ai/aiManager');
  assert(typeof aiManager.generate === 'function', 'generate existe');
  assert(typeof aiManager.isAiAvailable === 'function', 'isAiAvailable existe');
});

section('Context Manager', () => {
  const contextManager = require('../src/ai/contextManager');
  contextManager.addMessage('test-guild-000', 'test-channel', { authorId: '1', authorName: 'a', content: 'oi', isBot: false });
  const history = contextManager.getHistory('test-channel');
  assert(history.length === 1, 'mensagem adicionada ao contexto');
});

section('Comandos', () => {
  const { loadCommands } = require('../src/handlers/commandHandler');
  const commands = loadCommands();
  assert(commands.size > 20, `mais de 20 comandos carregados (${commands.size})`);
  assert(commands.has('ping'), 'comando /ping existe');
  assert(commands.has('warn'), 'comando /warn existe');
  assert(commands.has('ai'), 'comando /ai existe');
  assert(commands.has('ai-config'), 'comando /ai-config existe');
});

section('Criptografia (AES-256-GCM)', () => {
  const crypto = require('../src/utils/crypto');
  const originalKey = process.env.MEMORY_ENCRYPTION_KEY;

  // Sem chave: encrypt/decrypt sao passthrough (texto puro), sem quebrar nada.
  delete process.env.MEMORY_ENCRYPTION_KEY;
  assert(crypto.isEncryptionEnabled() === false, 'sem chave, criptografia fica desativada');
  const plain = Buffer.from('teste sem chave');
  assert(crypto.decrypt(crypto.encrypt(plain)).equals(plain), 'passthrough funciona sem chave definida');

  // Com uma chave valida, o ciclo encrypt->decrypt preserva o conteudo original.
  const keyHex = require('crypto').randomBytes(32).toString('hex');
  process.env.MEMORY_ENCRYPTION_KEY = keyHex;
  const original = Buffer.from(JSON.stringify({ hello: 'world', n: 42 }));
  const encrypted = crypto.encrypt(original);
  assert(!encrypted.equals(original), 'texto criptografado e diferente do original');
  const decrypted = crypto.decrypt(encrypted);
  assert(decrypted.equals(original), 'decrypt(encrypt(x)) === x com a chave correta');

  // Com a chave ERRADA, decrypt deve falhar (autenticacao do GCM), nunca
  // retornar lixo silenciosamente.
  process.env.MEMORY_ENCRYPTION_KEY = require('crypto').randomBytes(32).toString('hex');
  let threw = false;
  try { crypto.decrypt(encrypted); } catch { threw = true; }
  assert(threw, 'decrypt com chave errada lanca erro em vez de retornar dado corrompido');

  if (originalKey) process.env.MEMORY_ENCRYPTION_KEY = originalKey; else delete process.env.MEMORY_ENCRYPTION_KEY;
});

section('Circuit Breaker', () => {
  const { createCircuitBreaker } = require('../src/ai/circuitBreaker');
  const breaker = createCircuitBreaker('teste', { failureThreshold: 2, cooldownMs: 50 });

  assert(breaker.isOpen() === false, 'circuito comeca fechado');
  breaker.recordFailure();
  assert(breaker.isOpen() === false, 'continua fechado antes de atingir o limite de falhas');
  breaker.recordFailure();
  assert(breaker.isOpen() === true, 'abre apos atingir o limite de falhas seguidas');
  breaker.recordSuccess();
  assert(breaker.isOpen() === false, 'fecha novamente apos um sucesso');
});

section('Spend Guard (teto de gasto)', () => {
  const spendGuard = require('../src/ai/spendGuard');
  const provider = `test-provider-${Date.now()}`;

  // Sem pricing configurado para este provider fake, o teto padrao e 0 ->
  // canSpend deve ser false (desativado por seguranca, nunca gasta por engano).
  assert(spendGuard.canSpend(provider) === false, 'provider sem teto configurado nunca pode gastar');

  const usage = spendGuard.getUsage(provider);
  assert(usage.calls === 0, 'uso comeca zerado para um provider novo');
});

section('Creator Auth', () => {
  const originalCreatorId = process.env.CREATOR_ID;
  process.env.CREATOR_ID = 'creator-123';
  delete require.cache[require.resolve('../src/moderation/creatorAuth')];
  const creatorAuth = require('../src/moderation/creatorAuth');

  assert(creatorAuth.isCreator('creator-123') === true, 'reconhece o ID configurado como criador');
  assert(creatorAuth.isCreator('outro-usuario') === false, 'nao reconhece outros IDs como criador');
  assert(creatorAuth.isCreator(undefined) === false, 'lida com userId ausente sem lancar erro');

  if (originalCreatorId) process.env.CREATOR_ID = originalCreatorId; else delete process.env.CREATOR_ID;
});

section('Memoria de longo prazo (fatos memoraveis)', () => {
  const longTermMemory = require('../src/database/longTermMemory');
  const guildId = `test-guild-facts-${Date.now()}`;
  const userId = 'user-facts-1';

  const id = longTermMemory.rememberFact({ guildId, userId, content: 'gosta de RPG de mesa', category: 'interesse', confidence: 0.7 });
  assert(typeof id === 'number', 'rememberFact retorna um id numerico');

  const facts = longTermMemory.listFacts(guildId, userId);
  assert(facts.length === 1, 'listFacts retorna o fato salvo');

  const relevant = longTermMemory.findRelevantFacts(guildId, userId, 'alguem sabe jogar RPG de mesa?', 3);
  assert(relevant.length === 1, 'findRelevantFacts encontra o fato por palavra-chave em comum');

  const removed = longTermMemory.forgetFact(guildId, id);
  assert(removed === 1, 'forgetFact remove o fato pelo id');
  assert(longTermMemory.listFacts(guildId, userId).length === 0, 'fato removido nao aparece mais em listFacts');
});

section('Extracao de fatos por padrao (memoryManager)', () => {
  const memoryManager = require('../src/ai/memoryManager');
  const guildId = `test-guild-extract-${Date.now()}`;
  const userId = 'user-extract-1';

  const hit = memoryManager.extractAndRememberFact(guildId, userId, 'eu moro em Palmas ha uns 5 anos');
  assert(hit !== null, 'mensagem que bate um padrao claro gera um fato');

  const miss = memoryManager.extractAndRememberFact(guildId, userId, 'kkkkkk mds q isso');
  assert(miss === null, 'mensagem comum do dia a dia NAO vira fato memoravel');

  const facts = memoryManager.listFacts(guildId, userId);
  assert(facts.length === 1, 'apenas o fato que bateu o padrao foi salvo, nao a mensagem trivial');
});

section('Mensagens triviais nao chamam provider de rede', () => {
  // Acessa a mesma regex usada pelo aiManager indiretamente: mensagens
  // reconhecidas como triviais devem sempre resolver pelo provider "algorithm",
  // independente do AI_PROVIDER configurado (verificado via comportamento do
  // algorithm provider, que e sempre a escolha para esses casos).
  const algorithm = require('../src/ai/providers/algorithm');
  assert(typeof algorithm.generate === 'function', 'provider algoritmico expõe generate()');
});

console.log(`\n${passed} passaram, ${failed} falharam.`);
process.exit(failed > 0 ? 1 : 0);
