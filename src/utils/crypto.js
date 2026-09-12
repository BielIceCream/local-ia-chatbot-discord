'use strict';

// Criptografia autenticada (AES-256-GCM) para o arquivo de dados em disco.
// A chave NUNCA fica no codigo/Git - vem exclusivamente de
// MEMORY_ENCRYPTION_KEY no .env (ou secret manager equivalente).
// Sem a chave, o bot funciona normalmente mas grava em texto puro (uso
// local/dev) - um aviso e emitido para deixar isso explicito.
const crypto = require('crypto');
const logger = require('./logger');

const ALGORITHM = 'aes-256-gcm';
const MAGIC = Buffer.from('EGCM'); // marca arquivos criptografados por este modulo
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let warnedMissingKey = false;

function getKey() {
  const raw = process.env.MEMORY_ENCRYPTION_KEY;
  if (!raw) {
    if (!warnedMissingKey) {
      logger.warn('MEMORY_ENCRYPTION_KEY nao definida - o arquivo de dados sera salvo SEM criptografia. Gere uma chave com "npm run generate-key" para producao.', 'crypto');
      warnedMissingKey = true;
    }
    return null;
  }
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== 32) {
    logger.error('MEMORY_ENCRYPTION_KEY invalida: precisa ser uma string hex de 64 caracteres (32 bytes). Rode "npm run generate-key". Criptografia desativada nesta execucao.', 'crypto');
    return null;
  }
  return buf;
}

function isEncryptionEnabled() {
  return getKey() !== null;
}

/**
 * Recebe um Buffer em texto puro e retorna um Buffer criptografado (ou o
 * mesmo buffer, sem alteracao, se nenhuma chave estiver configurada).
 */
function encrypt(plainBuffer) {
  const key = getKey();
  if (!key) return plainBuffer;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([MAGIC, iv, authTag, ciphertext]);
}

/**
 * Recebe um Buffer lido do disco. Se tiver a marca de criptografia, decripta
 * (lancando erro se a chave estiver ausente/errada). Se nao tiver a marca
 * (arquivo antigo em texto puro, ou criptografia nunca foi ativada), retorna
 * o buffer como veio.
 */
function decrypt(buffer) {
  const isEncryptedFormat = buffer.length > MAGIC.length && buffer.slice(0, MAGIC.length).equals(MAGIC);
  if (!isEncryptedFormat) return buffer;

  const key = getKey();
  if (!key) {
    throw new Error('O arquivo de dados esta criptografado, mas MEMORY_ENCRYPTION_KEY nao foi definida (ou esta incorreta). Nao e possivel ler o banco sem a chave original.');
  }

  const iv = buffer.slice(MAGIC.length, MAGIC.length + IV_LENGTH);
  const authTag = buffer.slice(MAGIC.length + IV_LENGTH, MAGIC.length + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.slice(MAGIC.length + IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

module.exports = { encrypt, decrypt, isEncryptionEnabled };
