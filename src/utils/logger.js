'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config/config');

const LOG_DIR = path.join(ROOT, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const DEBUG = String(process.env.DEBUG).toLowerCase() === 'true';

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function writeToFile(line) {
  const file = path.join(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.log`);
  fs.appendFile(file, line + '\n', () => {});
}

function format(level, scope, message) {
  return `[${level}] ${timestamp()} ${scope ? `[${scope}] ` : ''}${message}`;
}

const logger = {
  info(message, scope) {
    const line = format('INFO', scope, message);
    console.log(line);
    writeToFile(line);
  },
  warn(message, scope) {
    const line = format('WARN', scope, message);
    console.warn(line);
    writeToFile(line);
  },
  error(message, scope) {
    const msg = message instanceof Error ? `${message.message}\n${message.stack}` : message;
    const line = format('ERROR', scope, msg);
    console.error(line);
    writeToFile(line);
  },
  debug(message, scope) {
    if (!DEBUG) return;
    const line = format('DEBUG', scope, message);
    console.log(line);
    writeToFile(line);
  }
};

module.exports = logger;
