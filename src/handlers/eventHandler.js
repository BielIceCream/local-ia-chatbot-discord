'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function loadEvents(client) {
  const eventsDir = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const event = require(path.join(eventsDir, file));
      if (!event || !event.name || !event.execute) {
        logger.warn(`Evento invalido ignorado: ${file}`, 'eventHandler');
        continue;
      }
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } catch (err) {
      logger.error(err, `eventHandler:${file}`);
    }
  }

  logger.info(`${files.length} eventos registrados.`, 'eventHandler');
}

module.exports = { loadEvents };
