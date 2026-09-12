'use strict';

const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const guildsDb = require('../database/guilds');
const { getGuildConfig } = require('../config/config');
const logger = require('../utils/logger');

const TICKET_TYPES = {
  support: { label: 'Suporte', emoji: '🎫' },
  technical: { label: 'Problema tecnico', emoji: '🛠️' },
  report: { label: 'Denuncia', emoji: '📩' },
  suggestion: { label: 'Sugestao', emoji: '💡' },
  question: { label: 'Duvida', emoji: '❓' }
};

async function createTicket(guild, member, type) {
  const cfg = getGuildConfig(guild.id);
  const typeInfo = TICKET_TYPES[type] || TICKET_TYPES.support;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
    { id: guild.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
  ];

  if (cfg.ticketSupportRoleId) {
    overwrites.push({ id: cfg.ticketSupportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
  }

  const channel = await guild.channels.create({
    name: `ticket-${member.user.username}`.slice(0, 90).toLowerCase(),
    type: ChannelType.GuildText,
    parent: cfg.ticketCategoryId || undefined,
    permissionOverwrites: overwrites,
    topic: `Ticket de ${member.user.tag} | Tipo: ${typeInfo.label}`
  });

  guildsDb.tickets.create(guild.id, channel.id, member.id, type);

  const embed = new EmbedBuilder()
    .setTitle(`${typeInfo.emoji} Ticket - ${typeInfo.label}`)
    .setDescription(`Ola ${member}, descreva sua solicitacao. A equipe respondera em breve.`)
    .setColor('#5865F2')
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  await channel.send({ content: `${member}${cfg.ticketSupportRoleId ? ` <@&${cfg.ticketSupportRoleId}>` : ''}`, embeds: [embed], components: [row] });
  logger.info(`Ticket criado: ${channel.name} (${type}) por ${member.user.tag}`, 'tickets');
  return channel;
}

async function closeTicket(channel, closedBy) {
  const ticket = guildsDb.tickets.get(channel.id);
  if (!ticket) return { ok: false, reason: 'Este canal nao e um ticket.' };

  // Transcript simples antes de fechar
  let transcript = '';
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    transcript = [...messages.values()]
      .reverse()
      .map((m) => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`)
      .join('\n');
  } catch (err) {
    logger.warn(`Nao foi possivel gerar transcript do ticket ${channel.id}: ${err.message}`, 'tickets');
  }

  guildsDb.tickets.close(channel.id);

  const cfg = getGuildConfig(channel.guild.id);
  if (cfg.logChannelId) {
    const logChannel = channel.guild.channels.cache.get(cfg.logChannelId);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('🔒 Ticket fechado')
        .addFields(
          { name: 'Canal', value: channel.name, inline: true },
          { name: 'Fechado por', value: `${closedBy}`, inline: true }
        )
        .setColor('#ED4245')
        .setTimestamp();
      await logChannel.send({ embeds: [embed] }).catch(() => {});
      if (transcript) {
        const buffer = Buffer.from(transcript, 'utf8');
        await logChannel.send({ files: [{ attachment: buffer, name: `${channel.name}-transcript.txt` }] }).catch(() => {});
      }
    }
  }

  setTimeout(() => channel.delete().catch(() => {}), 5000);
  return { ok: true };
}

module.exports = { TICKET_TYPES, createTicket, closeTicket };
