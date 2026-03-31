// src/backend/services/strikeService.js
const strikes = require("../models/strikeModel");
const users = require("../models/userModel");
const { prisma } = require("../prismaClient");

/**
 * Fügt Strike hinzu und schreibt ein SignupEvent (STRIKE_ADD).
 */
async function addStrike({ userId, reason, weight = 1, expiresAt = null, actorId = null }) {
  // Validierung
  const user = await users.findByDiscordId(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const created = await strikes.create({
    userId,
    reason,
    weight: Number.isFinite(weight) ? Number(weight) : 1,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdBy: actorId || null,
  });

  // Event-Log
  await prisma.signupEvent.create({
    data: {
      userId: String(userId),
      type: "STRIKE_ADD",
      note: `[w=${created.weight}] ${created.reason}`,
      actorId: actorId ? String(actorId) : null,
      raidId: null,
      charId: null,
    },
  });

  return created;
}

/**
 * Entfernt Strike (hard delete) und loggt STRIKE_REMOVE.
 */
async function removeStrike(id, { actorId = null } = {}) {
  const existing = await prisma.strike.findUnique({ where: { id: Number(id) } });
  if (!existing) throw new Error("NOT_FOUND");

  const removed = await strikes.removeById(id);

  await prisma.signupEvent.create({
    data: {
      userId: String(removed.userId),
      type: "STRIKE_REMOVE",
      note: `removed strike#${removed.id}`,
      actorId: actorId ? String(actorId) : null,
      raidId: null,
      charId: null,
    },
  });

  return removed;
}

async function updateStrike(id, data = {}, { actorId = null } = {}) {
  const updated = await strikes.updateById(id, {
    reason: data.reason ?? undefined,
    weight: Number.isFinite(data.weight) ? Number(data.weight) : undefined,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
  });

  await prisma.signupEvent.create({
    data: {
      userId: String(updated.userId),
      type: "STRIKE_EDIT",
      note: `edit strike#${updated.id}`,
      actorId: actorId ? String(actorId) : null,
      raidId: null,
      charId: null,
    },
  });

  return updated;
}

async function listByUser(userId, { activeOnly = false } = {}) {
  return strikes.listByUser(userId, { activeOnly });
}

async function listAll({ activeOnly = false, take = 500 } = {}) {
  return strikes.listAll({ activeOnly, take });
}

module.exports = {
  addStrike,
  removeStrike,
  updateStrike,
  listByUser,
  listAll,
};
