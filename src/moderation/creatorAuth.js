'use strict';

// Regra administrativa de MAIOR prioridade do bot (item 2 e 25): o Discord ID
// do criador vem EXCLUSIVAMENTE de uma variavel de ambiente. Isso e
// proposital - nunca do banco, nunca de um comando, nunca alteravel por uma
// mensagem do Discord, por uma memoria recuperada ou por uma resposta de
// qualquer provider de IA. Uma constante fixada na inicializacao do processo
// e a unica forma de garantir isso.
const CREATOR_ID = process.env.CREATOR_ID || null;

function isCreator(userId) {
  return !!CREATOR_ID && !!userId && userId === CREATOR_ID;
}

function requireCreator(userId) {
  if (!isCreator(userId)) {
    const err = new Error('Acao restrita ao criador do bot.');
    err.code = 'NOT_CREATOR';
    throw err;
  }
}

module.exports = { isCreator, requireCreator, CREATOR_ID };
