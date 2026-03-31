// src/backend/models/presetModel.js
/**
 * Repository/Model für Presets (kapselt Prisma)
 * - Nur DB-Zugriffe, keine Business-Logik
 *
 * Prisma (relevant):
 * model Preset {
 *   id          Int    @id @default(autoincrement())
 *   name        String
 *   tanks       Int    @default(0)
 *   healers     Int    @default(0)
 *   dps         Int    @default(0)
 *   lootbuddies Int    @default(0)
 *   raids       Raid[]
 * }
 */

const { prisma } = require("../prismaClient.js");

/* -------------------------------- Mapper -------------------------------- */

function map(p) {
  if (!p) return null;
  const base = {
    id: p.id,
    name: p.name,
    tanks: Number(p.tanks ?? 0),
    healers: Number(p.healers ?? 0),
    dps: Number(p.dps ?? 0),
    lootbuddies: Number(p.lootbuddies ?? 0),
  };
  if (p._count?.raids != null) base._counts = { raids: p._count.raids };
  return base;
}

function buildInclude({ withCounts = false } = {}) {
  const include = {};
  if (withCounts) include._count = { select: { raids: true } };
  return include;
}

function toInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/* -------------------------------- Queries -------------------------------- */

/**
 * Liste mit optionaler Suche/Sortierung.
 * @param {Object} opts
 * @param {Object} [opts.where]        - Prisma-Where
 * @param {string} [opts.q]            - Volltext (name contains)
 * @param {Array}  [opts.orderBy]      - Default: [{ name: "asc" }]
 * @param {boolean}[opts.withCounts]   - _count.raids
 * @param {number} [opts.take]
 * @param {number} [opts.skip]
 */
async function findMany({
  where,
  q,
  orderBy = [{ name: "asc" }],
  withCounts = true,
  take,
  skip,
} = {}) {
  const w = { ...(where || {}) };
  if (q) {
    const s = String(q).trim();
    if (s) w.name = { contains: s };
  }

  const rows = await prisma.preset.findMany({
    where: w,
    orderBy,
    include: buildInclude({ withCounts }),
    take: take || undefined,
    skip: skip || undefined,
  });

  return rows.map(map);
}

/** Ein Preset per ID */
async function findById(id, { withCounts = true } = {}) {
  const row = await prisma.preset.findUnique({
    where: { id: Number(id) },
    include: buildInclude({ withCounts }),
  });
  return map(row);
}
const getOne = findById;

/* -------------------------------- Writes -------------------------------- */

async function create(data = {}) {
  const payload = {
    name: String(data.name || "").trim(),
    tanks: toInt(data.tanks, 0),
    healers: toInt(data.healers, 0),
    dps: toInt(data.dps, 0),
    lootbuddies: toInt(data.lootbuddies, 0),
  };
  if (!payload.name) {
    const err = new Error("NAME_REQUIRED");
    err.code = "VALIDATION";
    throw err;
  }

  const row = await prisma.preset.create({
    data: payload,
    include: buildInclude({ withCounts: true }),
  });
  return map(row);
}

async function update(id, patch = {}) {
  const data = {
    name: patch.name !== undefined ? String(patch.name || "").trim() : undefined,
    tanks: patch.tanks !== undefined ? toInt(patch.tanks) : undefined,
    healers: patch.healers !== undefined ? toInt(patch.healers) : undefined,
    dps: patch.dps !== undefined ? toInt(patch.dps) : undefined,
    lootbuddies: patch.lootbuddies !== undefined ? toInt(patch.lootbuddies) : undefined,
  };

  // leere Namen nicht zulassen
  if (data.name !== undefined && !data.name) {
    const err = new Error("NAME_REQUIRED");
    err.code = "VALIDATION";
    throw err;
  }

  const row = await prisma.preset.update({
    where: { id: Number(id) },
    data,
    include: buildInclude({ withCounts: true }),
  });
  return map(row);
}

async function remove(id) {
  const row = await prisma.preset.delete({
    where: { id: Number(id) },
  });
  return map(row);
}

module.exports = {
  // Reads
  findMany,
  findById,
  getOne,

  // Writes
  create,
  update,
  remove,

  // intern
  _map: map,
};
