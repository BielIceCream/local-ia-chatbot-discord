'use strict';

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, Options } = require('discord.js');
const logger = require('./utils/logger');
const { setupGlobalHandlers } = require('./errors/errorHandler');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

// Ajustes de cache pensados para hospedagens com RAM muito limitada (ex:
// Discloud, plano de 100MB). Reduz drasticamente o que o discord.js mantem
// em memoria, mantendo apenas o essencial para os recursos deste bot.
const LOW_MEMORY_CACHE = Options.cacheWithLimits({
  ...Options.DefaultMakeCacheSettings,
  MessageManager: 30, // so o necessario para contexto de IA e /clear
  ReactionManager: 0,
  PresenceManager: 0,
  GuildBanManager: 0,
  GuildInviteManager: 0,
  GuildStickerManager: 0,
  GuildEmojiManager: 0,
  GuildScheduledEventManager: 0,
  StageInstanceManager: 0,
  ThreadManager: 20,
  ThreadMemberManager: 0,
  VoiceStateManager: 0
});

const LOW_MEMORY_SWEEPERS = {
  ...Options.DefaultSweeperSettings,
  messages: { interval: 300, lifetime: 900 }, // limpa mensagens em cache a cada 5min
  users: { interval: 3600, filter: () => (user) => user.bot && user.id !== user.client.user.id }
};

function checkStartupRequirements() {
  const missing = [];
  if (!process.env.DISCORD_TOKEN) missing.push('DISCORD_TOKEN');
  if (missing.length > 0) {
    logger.error(`Variaveis de ambiente obrigatorias ausentes: ${missing.join(', ')}. Copie .env.example para .env e preencha os valores.`, 'startup');
    process.exit(1);
  }
}

async function main() {
  checkStartupRequirements();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions
      // GuildVoiceStates removido: nenhum recurso atual usa estado de voz,
      // e cada intent extra aumenta o cache e o trafego do gateway.
      // Reative se for implementar logs de voz ou cargos automaticos em call.
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    makeCache: LOW_MEMORY_CACHE,
    sweepers: LOW_MEMORY_SWEEPERS
  });

  setupGlobalHandlers(client);

  client.commands = new Collection();
  const loadedCommands = loadCommands();
  for (const [name, command] of loadedCommands) client.commands.set(name, command);

  loadEvents(client);

  logger.info('[✓] Database', 'startup');
  logger.info('[✓] Commands', 'startup');
  logger.info('[✓] Moderation', 'startup');
  logger.info('[✓] Economy', 'startup');
  logger.info('[✓] Tickets', 'startup');

  const aiManager = require('./ai/aiManager');
  const activeProvider = await aiManager.getActiveProvider();
  const providerLabel = activeProvider ? activeProvider.name : 'none';
  logger.info(`[✓] AI provider: ${providerLabel}`, 'startup');

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((err) => {
  logger.error(err, 'startup');
  process.exit(1);
});
