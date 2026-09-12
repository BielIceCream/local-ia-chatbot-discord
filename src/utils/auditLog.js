'use strict';

// Log de auditoria (item 26) para acoes administrativas sensiveis: quem fez
// o que, quando, e o resultado. Nunca escreva segredos/tokens/senhas aqui -
// isso e responsabilidade de quem chama record().
const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config/config');

const LOG_DIR = path.join(ROOT, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const AUDIT_PATH = path.join(LOG_DIR, 'audit.log');

function record(actorId, action, details, result) {
  const entry = {
    ts: new Date().toISOString(),
    actorId,
    action,
    details: details || null,
    result: result || 'ok'
  };
  fs.appendFile(AUDIT_PATH, `${JSON.stringify(entry)}\n`, () => {});
}

module.exports = { record, AUDIT_PATH };
