'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CONFIG_EXAMPLE_PATH = path.join(ROOT, 'config.example.json');
const CONFIG_PATH = path.join(ROOT, 'config.json');
const GUILDS_DIR = path.join(ROOT, 'data', 'guilds');

function ensureGlobalConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.copyFileSync(CONFIG_EXAMPLE_PATH, CONFIG_PATH);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

if (!fs.existsSync(GUILDS_DIR)) {
  fs.mkdirSync(GUILDS_DIR, { recursive: true });
}

const globalConfig = ensureGlobalConfig();

const DEFAULT_GUILD_CONFIG = {
  language: 'pt-BR',
  logChannelId: null,
  welcomeChannelId: null,
  welcomeMessage: 'Bem-vindo, {user} ao {server}! Agora somos {memberCount} membros.',
  leaveChannelId: null,
  leaveMessage: '{user} saiu do servidor. Ate mais!',
  aiChannelId: null,
  aiEnabled: true,
  aiPersonality: null,
  aiTone: 'casual',
  aiHumor: 'moderado',
  aiFormality: 'informal',
  aiMaxReplyLength: null,
  contextMessageLimit: 15,
  ignoredChannels: [],
  ignoredRoles: [],
  adminRoles: [],
  moderatorRoles: [],
  silentChannels: [],
  keywords: ['bot', 'ajuda', 'help'],
  moderationEnabled: true,
  antiSpamEnabled: true,
  antiLinkEnabled: false,
  antiRaidEnabled: true,
  xpEnabled: true,
  xpPerMessageMin: 5,
  xpPerMessageMax: 15,
  xpCooldownMs: 60000,
  economyEnabled: true,
  currencyName: 'moedas',
  ticketsEnabled: true,
  ticketCategoryId: null,
  ticketSupportRoleId: null,
  suggestionsChannelId: null,
  suggestionsEnabled: true
};

function guildConfigPath(guildId) {
  return path.join(GUILDS_DIR, `${guildId}.json`);
}

function getGuildConfig(guildId) {
  const filePath = guildConfigPath(guildId);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_GUILD_CONFIG, null, 2));
    return { ...DEFAULT_GUILD_CONFIG };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { ...DEFAULT_GUILD_CONFIG, ...raw };
  } catch (err) {
    return { ...DEFAULT_GUILD_CONFIG };
  }
}

function setGuildConfig(guildId, partialConfig) {
  const current = getGuildConfig(guildId);
  const updated = { ...current, ...partialConfig };
  fs.writeFileSync(guildConfigPath(guildId), JSON.stringify(updated, null, 2));
  return updated;
}

module.exports = {
  global: globalConfig,
  DEFAULT_GUILD_CONFIG,
  getGuildConfig,
  setGuildConfig,
  ROOT
};
