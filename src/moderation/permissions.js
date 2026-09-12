'use strict';

const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../config/config');
const { isCreator } = require('./creatorAuth');

function memberHasAnyRole(member, roleIds) {
  if (!roleIds || roleIds.length === 0) return false;
  return member.roles.cache.some((role) => roleIds.includes(role.id));
}

function isAdmin(member) {
  if (!member) return false;
  // O criador do bot (item 2, 25) tem autoridade maxima sempre, independente
  // de cargos/permissoes do Discord no servidor - isso NUNCA depende de
  // configuracao alteravel por comando ou mensagem.
  if (isCreator(member.id)) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const cfg = getGuildConfig(member.guild.id);
  return memberHasAnyRole(member, cfg.adminRoles);
}

function isModerator(member) {
  if (!member) return false;
  if (isAdmin(member)) return true;
  if (member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return true;
  const cfg = getGuildConfig(member.guild.id);
  return memberHasAnyRole(member, cfg.moderatorRoles);
}

function canManageMessages(member) {
  return isModerator(member) || (member && member.permissions.has(PermissionsBitField.Flags.ManageMessages));
}

function canManageMembers(member) {
  return isModerator(member) || (member && (
    member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
    member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
    member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
  ));
}

function canManageServer(member) {
  return isAdmin(member) || (member && member.permissions.has(PermissionsBitField.Flags.ManageGuild));
}

/**
 * Impede que um moderador tente agir contra alguem com cargo igual ou superior,
 * ou contra o dono do servidor / a si mesmo, e evita alvejar o proprio bot.
 */
function canTarget(executorMember, targetMember) {
  if (!targetMember) return { ok: true };
  if (targetMember.id === executorMember.id) {
    return { ok: false, reason: 'Voce nao pode executar esta acao em si mesmo.' };
  }
  if (targetMember.id === executorMember.guild.ownerId) {
    return { ok: false, reason: 'Voce nao pode executar esta acao no dono do servidor.' };
  }
  if (targetMember.roles.highest.position >= executorMember.roles.highest.position && executorMember.id !== executorMember.guild.ownerId) {
    return { ok: false, reason: 'Voce nao pode executar esta acao em alguem com cargo igual ou superior ao seu.' };
  }
  return { ok: true };
}

module.exports = { isAdmin, isModerator, canManageMessages, canManageMembers, canManageServer, canTarget, isCreator };
