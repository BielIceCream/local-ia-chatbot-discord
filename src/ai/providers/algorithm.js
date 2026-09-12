'use strict';

// Provider ALGORITMICO: nao e IA generativa de verdade - e um motor de
// casamento de padroes + respostas variadas, com zero chamadas de rede e
// praticamente nenhum uso extra de memoria. Pensado para hospedagens com RAM
// muito limitada (ex: Discloud, plano de 100MB), onde rodar um modelo local
// via Ollama nao e viavel. Sempre disponivel, nunca falha por falta de rede.
const memoryManager = require('../memoryManager');

const PATTERNS = [
  { test: /\b(voce e um bot|voce e real|voce e humano|voce e uma ia|voce e ia)\b/i,
    replies: ['Sou um bot deste servidor, mas tento ajudar do jeito que der!', 'So um programinha por aqui, mas fico feliz em ajudar.'] },
  { test: /\b(piada|conta uma piada)\b/i,
    replies: ['Por que o JavaScript foi ao psicologo? Muitos "callbacks" nao resolvidos. kkk', 'Nao tenho um repertorio muito grande de piadas ainda, mas prometo treinar. 😅'] },
  { test: /\b(ajuda|help|socorro|duvida)\b/i,
    replies: ['Da uma olhada em `/help` que tem todos os comandos listados ali.', 'Se for algo urgente, chama um moderador do servidor.'] },
  { test: /\b(obrigad\w*|valeu|vlw|thanks)\b/i,
    replies: ['Disponha! 🙂', 'Por nada!', 'Sempre que precisar.'] },
  { test: /\b(tudo bem|como (voce )?(esta|vai)|blz|beleza)\b/i,
    replies: ['Tudo certo por aqui!', 'Rodando liso 🙂 e voce?', 'Tudo tranquilo!'] },
  { test: /\b(oi|ola|opa|eae|e ai|bom dia|boa tarde|boa noite|salve)\b/i,
    replies: ['Opa! 👋', 'E ai! Tudo certo?', 'Oi! Como posso ajudar?', 'Salve!'] },
  { test: /\b(concordo|isso mesmo|exato|verdade|com certeza)\b/i,
    replies: ['Faz sentido.', 'Boa observacao.', 'Concordo com isso.'] },
  { test: /\b(tchau|ate mais|falou|flw|xau)\b/i,
    replies: ['Ate mais! 👋', 'Falou!', 'Ate a proxima!'] },
  // Risadas/reacoes puras (ex: "kkkkkk", "hahaha", "rsrs") - a maioria das
  // mensagens triviais roteadas pra ca (aiManager) cai aqui. Sem este
  // padrao, elas caiam no fallback generico ("boa pergunta..."), que soa
  // estranho como resposta a uma risada.
  { test: /^[\s!.?]*(?:kk+|rs+|haha+|hehe+|😂+|🤣+)[\s!.?]*$/i,
    replies: ['kkkkkk', '😂', 'kkkkk verdade', 'haha boa'] }
];

const FALLBACK_REPLIES = [
  'Boa pergunta, nao tenho certeza sobre isso.',
  'Nao consegui identificar uma resposta pronta pra isso — algum humano por ai sabe?',
  'Hmm, essa eu nao sei responder com certeza.',
  'Nao tenho essa informacao guardada, mas posso ajudar com comandos do servidor (`/help`).'
];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Checa se algo salvo na memoria persistente do servidor (via /ai-config
// lembrar) responde diretamente a mensagem, comparando pela chave.
function matchPersistentMemory(guildId, message) {
  if (!guildId) return null;
  const memories = memoryManager.listMemories(guildId);
  if (!memories || memories.length === 0) return null;
  const lower = message.toLowerCase();
  const hit = memories.find((item) => lower.includes(item.key.toLowerCase()));
  return hit ? hit.value : null;
}

async function isAvailable() {
  return true; // nao depende de rede nem de modelo carregado - sempre pronto
}

async function generate({ guildId, userId, message }) {
  const text = message || '';

  const memoryHit = matchPersistentMemory(guildId, text);
  if (memoryHit) return memoryHit;

  const relevantFacts = guildId ? memoryManager.findRelevantFacts(guildId, userId, text, 1) : [];
  if (relevantFacts.length > 0) {
    // Resposta simples usando o fato encontrado como dado, nunca como
    // instrucao (item 11) - so uma confirmacao natural do que ja se sabe.
    return `Ah, eu lembro: ${relevantFacts[0].content}`;
  }

  for (const pattern of PATTERNS) {
    if (pattern.test.test(text)) return pickRandom(pattern.replies);
  }

  return pickRandom(FALLBACK_REPLIES);
}

module.exports = { name: 'algorithm', isAvailable, generate };
