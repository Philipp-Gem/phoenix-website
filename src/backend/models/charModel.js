// src/backend/models/charsModel.js
// Prisma-Zugriffe für BoosterChar

const { prisma } = require("../prismaClient.js");

function map(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    realm: row.realm,
    class: row.class || null,
    spec: row.spec || null,
    rioScore: row.rioScore ?? null,
    progress: row.progress || null,
    itemLevel: row.itemLevel ?? null,
    wclUrl: row.wclUrl || null,
    updatedAt: row.updatedAt,
  };
}

/**
 * Upsert via Composite-Unique (userId, name, realm)
 */
async function upsertForUser(userId, payload) {
  const key = {
    userId_name_realm: {
      userId: String(userId),
      name: payload.name,
      realm: payload.realm,
    },
  };

  const saved = await prisma.boosterChar.upsert({
    where: key,
    create: {
      userId: String(userId),
      name: payload.name,
      realm: payload.realm,
      class: payload.class || null,
      spec: payload.spec || null,
      rioScore: payload.rioScore ?? null,
      progress: payload.progress || null,
      itemLevel: payload.itemLevel ?? null,
      wclUrl: payload.wclUrl || null,
    },
    update: {
      class: payload.class || null,
      spec: payload.spec || null,
      rioScore: payload.rioScore ?? null,
      progress: payload.progress || null,
      itemLevel: payload.itemLevel ?? null,
      wclUrl: payload.wclUrl || null,
    },
  });

  return map(saved);
}

async function listForUser(userId) {
  const rows = await prisma.boosterChar.findMany({
    where: { userId: String(userId) },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
  return rows.map(map);
}

module.exports = {
  upsertForUser,
  listForUser,
  map,
};
