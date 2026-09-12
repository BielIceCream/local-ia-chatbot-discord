'use strict';

const logger = require('../utils/logger');
const { friendlyDiscordError } = require('../errors/errorHandler');
const { incrementCommandUse } = require('../database/database');
const ticketManager = require('../tickets/ticketManager');
const guildsDb = require('../database/guilds');
const { global: globalConfig } = require('../config/config');
const { EmbedBuilder } = require('discord.js');

const cooldowns = new Map(); // `${commandName}:${userId}` -> timestamp

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        logger.warn(`Comando desconhecido: ${interaction.commandName}`, 'interactionCreate');
        return;
      }

      const cooldownKey = `${interaction.commandName}:${interaction.user.id}`;
      const lastUse = cooldowns.get(cooldownKey) || 0;
      const cooldownMs = command.cooldownMs || globalConfig.cooldowns.commandPerUserMs;
      if (Date.now() - lastUse < cooldownMs) {
        await interaction.reply({ content: `⏳ Aguarde um pouco antes de usar \`/${interaction.commandName}\` novamente.`, ephemeral: true }).catch(() => {});
        return;
      }
      cooldowns.set(cooldownKey, Date.now());

      try {
        await command.execute(interaction, { client });
        incrementCommandUse(interaction.commandName);
      } catch (err) {
        logger.error(err, `command:${interaction.commandName}`);
        const content = `❌ ${friendlyDiscordError(err)}`;
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content }).catch(() => {});
        } else {
          await interaction.reply({ content, ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isButton()) {
      try {
        if (interaction.customId === 'ticket_close') {
          await interaction.deferReply();
          const result = await ticketManager.closeTicket(interaction.channel, interaction.user);
          await interaction.editReply(result.ok ? '🔒 Ticket sera fechado em instantes...' : `❌ ${result.reason}`);
          return;
        }

        if (interaction.customId.startsWith('ticket_open_')) {
          const type = interaction.customId.replace('ticket_open_', '');
          await interaction.deferReply({ ephemeral: true });
          const channel = await ticketManager.createTicket(interaction.guild, interaction.member, type);
          await interaction.editReply(`🎫 Ticket criado: ${channel}`);
          return;
        }

        if (interaction.customId.startsWith('suggestion_')) {
          const [, action, suggestionMessageId] = interaction.customId.split('_').length === 3
            ? interaction.customId.split('_')
            : [null, interaction.customId.split('_')[1], interaction.message.id];
          const suggestion = guildsDb.suggestions.get(interaction.message.id);
          if (!suggestion) {
            await interaction.reply({ content: 'Sugestao nao encontrada no banco de dados.', ephemeral: true });
            return;
          }
          if (action === 'up' || action === 'down') {
            let { upvotes, downvotes } = suggestion;
            if (action === 'up') upvotes += 1; else downvotes += 1;
            guildsDb.suggestions.vote(interaction.message.id, upvotes, downvotes);
            const embed = EmbedBuilder.from(interaction.message.embeds[0]).setFields(
              { name: '👍', value: String(upvotes), inline: true },
              { name: '👎', value: String(downvotes), inline: true }
            );
            await interaction.update({ embeds: [embed] });
          }
          return;
        }
      } catch (err) {
        logger.error(err, 'interactionCreate:button');
        const content = `❌ ${friendlyDiscordError(err)}`;
        if (interaction.deferred || interaction.replied) await interaction.editReply(content).catch(() => {});
        else await interaction.reply({ content, ephemeral: true }).catch(() => {});
      }
    }
  }
};
