// src/backend/models/strikeModel.js
const { prisma } = require("../prismaClient");

function mapStrike(s) {
  if (!s) return null;
  return {
    id: s.id,
    userId: s.userId,
    reason: s.reason,
    weight: s.weight ?? 1,
    expiresAt: s.expiresAt || null,
    createdBy: s.createdBy || null,
    createdAt: s.createdAt,
  };
}

async function create({ userId, reason, weight = 1, expiresAt = null, createdBy = null }) {
  const row = await prisma.strike.create({
    data: { userId: String(userId), reason, weight, expiresAt, createdBy },
  });
  return mapStrike(row);
}

async function removeById(id) {
  const row = await prisma.strike.delete({ where: { id: Number(id) } });
  return mapStrike(row);
}

async function updateById(id, data) {
  const row = await prisma.strike.update({ where: { id: Number(id) }, data });
  return mapStrike(row);
}

async function listByUser(userId, { activeOnly = false } = {}) {
  const where = { userId: String(userId) };
  if (activeOnly) {
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
  }
  const rows = await prisma.strike.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
  });
  return rows.map(mapStrike);
}

async function listAll({ activeOnly = false, take = 500 } = {}) {
  const where = {};
  if (activeOnly) {
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
  }
  const rows = await prisma.strike.findMany({
    where,
    take,
    orderBy: [{ createdAt: "desc" }],
  });
  return rows.map(mapStrike);
}

module.exports = {
  create,
  removeById,
  updateById,
  listByUser,
  listAll,
};
