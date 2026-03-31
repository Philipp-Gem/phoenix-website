// src/backend/models/userModel.js
const { prisma } = require("../prismaClient");

/* ------------------------------ Mappers ------------------------------ */

function mapBase(u) {
  if (!u) return null;
  return {
    id: u.id ?? null,
    discordId: String(u.discordId),
    displayName: u.displayName || null,
    username: u.username || null,
    avatarUrl: u.avatarUrl || null,

    isOwner: !!u.isOwner,
    isAdmin: !!u.isAdmin,
    isRaidlead: !!u.isRaidlead,
    roleLevel: u.roleLevel ?? 0,
    highestRole: u.highestRole ?? null,
    rolesCsv: u.rolesCsv ?? null,

    createdAt: u.createdAt ?? null,
    updatedAt: u.updatedAt ?? null,
  };
}

function mapWithDetails(u) {
  const base = mapBase(u);
  if (!base) return null;

  const chars = (u.chars || []).map((c) => ({
    id: c.id,
    name: c.name,
    realm: c.realm,
    class: c.class,
    spec: c.spec,
    itemLevel: c.itemLevel,
    rioScore: c.rioScore,
    wclUrl: c.wclUrl,
    updatedAt: c.updatedAt,
  }));

  const history = (u.signups || [])
    .map((s) => ({
      id: s.id,
      raidId: s.raidId,
      date: s.raid?.date || null,
      raidTitle: s.raid?.title || null,
      status: s.status,
      type: s.type,
      saved: s.saved,
      char: s.char
        ? {
            id: s.char.id,
            name: s.char.name,
            realm: s.char.realm,
            class: s.char.class,
            spec: s.char.spec,
            itemLevel: s.char.itemLevel,
          }
        : null,
    }))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // 🔹 NEU: Strike-Anzahl mitliefern (nur Erweiterung, keine Removals)
  const strikeCount =
    (u._count && typeof u._count.strikes === "number"
      ? u._count.strikes
      : Array.isArray(u.strikes)
      ? u.strikes.length
      : 0) || 0;

  return { ...base, chars, history, strikeCount };
}

/* ------------------------------- Reads ------------------------------- */

async function findMany(opts = {}) {
  const {
    where,
    orderBy = [{ displayName: "asc" }, { username: "asc" }],
    select,
  } = opts || {};

  const rows = await prisma.user.findMany({
    where,
    orderBy,
    select:
      select ||
      {
        id: true,
        discordId: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        isOwner: true,
        isAdmin: true,
        isRaidlead: true,
        roleLevel: true,
        rolesCsv: true,
        highestRole: true,
        createdAt: true,
        updatedAt: true,
      },
  });
  return rows.map(mapBase);
}

async function findManyWithDetails(opts = {}) {
  const { q, limit = 250, historyTake = 20 } = opts || {};

  // Hinweis: SQLite → kein mode: "insensitive"
  const where = q
    ? {
        OR: [
          { displayName: { contains: q } },
          { username: { contains: q } },
          { discordId: { contains: q } },
        ],
      }
    : undefined;

  const rows = await prisma.user.findMany({
    where,
    take: limit,
    orderBy: [{ displayName: "asc" }, { username: "asc" }],
    include: {
      // bestehend
      chars: { orderBy: [{ itemLevel: "desc" }, { updatedAt: "desc" }] },
      signups: {
        take: historyTake,
        orderBy: { createdAt: "desc" },
        include: { raid: true, char: true },
      },
      // 🔹 NEU: nur Count laden (effizient, keine Daten entfernt)
      _count: { select: { strikes: true } },
    },
  });

  return rows.map(mapWithDetails);
}

async function findUnique(where) {
  const u = await prisma.user.findUnique({
    where,
    select: {
      id: true,
      discordId: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      isOwner: true,
      isAdmin: true,
      isRaidlead: true,
      roleLevel: true,
      rolesCsv: true,
      highestRole: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return mapBase(u);
}

async function findByDiscordId(discordId) {
  return findUnique({ discordId: String(discordId) });
}

async function findLeads() {
  const rows = await prisma.user.findMany({
    where: { isRaidlead: true },
    orderBy: [{ displayName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      discordId: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      isRaidlead: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map(mapBase);
}

/* ------------------------------ Writes ------------------------------- */

async function create(data) {
  const u = await prisma.user.create({ data });
  return mapBase(u);
}

async function update(where, data) {
  const u = await prisma.user.update({ where, data });
  return mapBase(u);
}

async function updateByDiscordId(discordId, data) {
  return update({ discordId: String(discordId) }, data);
}

async function remove(where) {
  const u = await prisma.user.delete({ where });
  return mapBase(u);
}

async function removeByDiscordId(discordId) {
  return remove({ discordId: String(discordId) });
}

async function upsertFromDiscord(payload) {
  const discordId = String(payload.discordId);
  const data = {
    username: payload.username ?? undefined,
    displayName: payload.displayName ?? undefined,
    avatarUrl: payload.avatarUrl ?? undefined,
    rolesCsv: payload.rolesCsv ?? undefined,
    highestRole: payload.highestRole ?? undefined,
    roleLevel: payload.roleLevel ?? undefined,
    isOwner: payload.isOwner ?? undefined,
    isAdmin: payload.isAdmin ?? undefined,
    isRaidlead: payload.isRaidlead ?? undefined,
  };

  const row = await prisma.user.upsert({
    where: { discordId },
    create: { discordId, ...data },
    update: data,
  });
  return mapBase(row);
}

module.exports = {
  findMany,
  findManyWithDetails,
  findUnique,
  findByDiscordId,
  findLeads,
  create,
  update,
  updateByDiscordId,
  remove,
  removeByDiscordId,
  upsertFromDiscord,
};
