// src/backend/models/raidModel.js
const { prisma } = require("../prismaClient");

// Mapper: reduziert Prisma-Objekt auf das, was wir im REST zurückgeben
function mapBase(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    difficulty: r.difficulty,
    lootType: r.lootType,
    bosses: r.bosses,
    date: r.date,
    lead: r.lead,
    presetId: r.presetId,
    channelId: r.channelId,
    messageId: r.messageId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,

    // optionale Zusätze
    signupsCount: r._count?.signups ?? undefined,
    preset: r.preset
      ? {
          id: r.preset.id,
          name: r.preset.name,
          tanks: r.preset.tanks,
          healers: r.preset.healers,
          dps: r.preset.dps,
          lootbuddies: r.preset.lootbuddies,
        }
      : undefined,
  };
}

async function findMany(opts = {}) {
  const {
    take = 100,
    skip = 0,
    orderBy = { date: "asc" },
    withCounts = true,
    withPreset = false,
  } = opts || {};

  const rows = await prisma.raid.findMany({
    take,
    skip,
    orderBy,
    include: {
      _count: withCounts ? { select: { signups: true } } : undefined,
      preset: withPreset,
    },
  });
  return rows.map(mapBase);
}

async function findOne(id, opts = {}) {
  const { withCounts = true, withPreset = false } = opts || {};
  const r = await prisma.raid.findUnique({
    where: { id: Number(id) },
    include: {
      _count: withCounts ? { select: { signups: true } } : undefined,
      preset: withPreset,
    },
  });
  return mapBase(r);
}

// ✅ Alias für bestehende Controller-Aufrufe
async function findById(id, opts = {}) {
  return findOne(id, opts);
}

async function create(data) {
  const r = await prisma.raid.create({ data });
  return mapBase(r);
}

async function update(id, data) {
  const r = await prisma.raid.update({
    where: { id: Number(id) },
    data,
  });
  return mapBase(r);
}

async function remove(id) {
  const r = await prisma.raid.delete({ where: { id: Number(id) } });
  return mapBase(r);
}

module.exports = {
  findMany,
  findOne,
  findById, // 👈 Alias
  create,
  update,
  remove,
};
