// src/backend/models/signupModel.js
/**
 * Repository/Model für Signups (kapselt Prisma)
 * - Nur DB-Zugriffe, keine Business-Logik
 *
 * Prisma (vereinfacht):
 * model Signup {
 *   id          Int      @id @default(autoincrement())
 *   raidId      Int
 *   userId      String?
 *   type        String   @default("DPS")
 *   charId      Int?
 *   displayName String?
 *   saved       Boolean  @default(false)
 *   note        String?
 *   class       String?
 *   status      String   @default("SIGNUPED")
 *   createdAt   DateTime @default(now())
 *   raid  Raid         @relation(fields: [raidId], references: [id], onDelete: Cascade)
 *   char  BoosterChar? @relation(fields: [charId], references: [id], onDelete: SetNull)
 *   user  User?        @relation(fields: [userId], references: [discordId], onDelete: SetNull)
 *   @@unique([raidId, charId]) // greift, sobald charId gesetzt ist
 * }
 */

const { prisma } = require("../prismaClient.js");

/* --------------------------------- Consts -------------------------------- */

const ALLOWED_TYPES = ["TANK", "HEAL", "DPS", "LOOTBUDDY"];
const ALLOWED_STATUS = ["SIGNUPED", "PICKED"];

/* -------------------------------- Mapper --------------------------------- */

function mapUser(u) {
  if (!u) return null;
  return {
    discordId: u.discordId,
    username: u.username ?? null,
    displayName: u.displayName ?? null,
    avatarUrl: u.avatarUrl ?? null,
    isOwner: !!u.isOwner,
    isAdmin: !!u.isAdmin,
    isRaidlead: !!u.isRaidlead,
  };
}

function mapChar(c) {
  if (!c) return null;
  return {
    id: c.id,
    userId: c.userId,
    name: c.name,
    realm: c.realm,
    class: c.class ?? null,
    spec: c.spec ?? null,
    itemLevel: c.itemLevel == null ? null : Number(c.itemLevel),
  };
}

function map(row, { withChar = false, withUser = false } = {}) {
  if (!row) return null;
  const base = {
    id: row.id,
    raidId: row.raidId,
    userId: row.userId ?? null,
    type: row.type || "DPS",
    charId: row.charId ?? null,
    displayName: row.displayName ?? null,
    saved: !!row.saved,
    note: row.note ?? null,
    class: row.class ?? null,
    status: row.status || "SIGNUPED",
    createdAt: row.createdAt,
  };
  if (withChar) base.char = mapChar(row.char);
  if (withUser) base.user = mapUser(row.user);
  return base;
}

function buildInclude({ withChar = false, withUser = false } = {}) {
  const include = {};
  if (withChar) {
    include.char = {
      select: {
        id: true, userId: true, name: true, realm: true,
        class: true, spec: true, itemLevel: true,
      },
    };
  }
  if (withUser) {
    include.user = {
      select: {
        discordId: true, username: true, displayName: true, avatarUrl: true,
        isOwner: true, isAdmin: true, isRaidlead: true,
      },
    };
  }
  return include;
}

/* ------------------------------ Normalizer ------------------------------ */

function normType(v) {
  const t = String(v || "DPS").toUpperCase();
  return ALLOWED_TYPES.includes(t) ? t : "DPS";
}
function normStatus(v) {
  if (v == null) return undefined;
  const s = String(v).toUpperCase();
  return ALLOWED_STATUS.includes(s) ? s : undefined;
}
function toStrOrNull(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v);
  return s;
}

/* --------------------------------- Reads --------------------------------- */

/** Alle Signups eines Raids */
async function listByRaid(raidId, { withChar = false, withUser = false } = {}) {
  const rows = await prisma.signup.findMany({
    where: { raidId: Number(raidId) },
    orderBy: [{ createdAt: "asc" }],
    include: buildInclude({ withChar, withUser }),
  });
  return rows.map((r) => map(r, { withChar, withUser }));
}

/** Alle Signups eines Users (Discord-ID) */
async function listByUser(discordUserId, { withChar = false, withUser = false } = {}) {
  const rows = await prisma.signup.findMany({
    where: { userId: String(discordUserId) },
    orderBy: [{ createdAt: "desc" }],
    include: buildInclude({ withChar, withUser }),
  });
  return rows.map((r) => map(r, { withChar, withUser }));
}

/** Ein Signup per ID */
async function findById(id, { withChar = false, withUser = false } = {}) {
  const row = await prisma.signup.findUnique({
    where: { id: Number(id) },
    include: buildInclude({ withChar, withUser }),
  });
  return map(row, { withChar, withUser });
}

/** Ein Signup per Composite-Key (raidId+charId) */
async function findByRaidAndChar(raidId, charId, { withChar = false, withUser = false } = {}) {
  const row = await prisma.signup.findFirst({
    where: { raidId: Number(raidId), charId: Number(charId) },
    include: buildInclude({ withChar, withUser }),
  });
  return map(row, { withChar, withUser });
}

/* -------------------------------- Writes -------------------------------- */

/** Signup erstellen */
async function create(data = {}, { withChar = false, withUser = false } = {}) {
  const payload = {
    raidId: Number(data.raidId),
    userId: data.userId != null ? String(data.userId) : null,
    type: normType(data.type),
    charId: data.charId != null ? Number(data.charId) : null,
    displayName: toStrOrNull(data.displayName) ?? null,
    saved: !!data.saved,
    note: toStrOrNull(data.note) ?? null,
    class: toStrOrNull(data.class) ?? null,
    status: normStatus(data.status) ?? "SIGNUPED",
  };

  if (!Number.isFinite(payload.raidId)) {
    const err = new Error("RAID_ID_REQUIRED");
    err.code = "VALIDATION";
    throw err;
  }

  const row = await prisma.signup.create({
    data: payload,
    include: buildInclude({ withChar, withUser }),
  });
  return map(row, { withChar, withUser });
}

/**
 * Idempotenter Upsert per Key:
 *  - bevorzugt Composite-Key (raidId+charId), wenn charId gesetzt.
 *  - wenn charId null ist, versuchen wir, (raidId, userId, charId=null) als „quasi unique“
 *    zu behandeln (App-Logik); Prisma garantiert hier keine Eindeutigkeit.
 */
async function upsertByRaidAndChar(data = {}, { withChar = false, withUser = false } = {}) {
  const raidId = Number(data.raidId);
  const charId = data.charId == null ? null : Number(data.charId);
  const userId = data.userId != null ? String(data.userId) : null;

  if (!Number.isFinite(raidId)) {
    const err = new Error("RAID_ID_REQUIRED");
    err.code = "VALIDATION";
    throw err;
  }

  const update = {
    userId,
    type: normType(data.type),
    displayName: toStrOrNull(data.displayName),
    saved: data.saved === undefined ? undefined : !!data.saved,
    note: toStrOrNull(data.note),
    class: toStrOrNull(data.class),
    status: normStatus(data.status),
  };

  // undef-Felder entfernen
  Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

  const include = buildInclude({ withChar, withUser });

  if (charId != null) {
    // Echter Composite-Key vorhanden → Upsert via raidId_charId
    const row = await prisma.signup.upsert({
      where: { raidId_charId: { raidId, charId } },
      update,
      create: {
        raidId,
        charId,
        userId,
        type: update.type ?? "DPS",
        displayName: update.displayName ?? null,
        saved: update.saved ?? false,
        note: update.note ?? null,
        class: update.class ?? null,
        status: update.status ?? "SIGNUPED",
      },
      include,
    });
    return map(row, { withChar, withUser });
  }

  // Kein charId → weicher Upsert (findFirst → update/create)
  const existing = await prisma.signup.findFirst({
    where: { raidId, charId: null, userId },
    include,
  });
  if (existing) {
    const row = await prisma.signup.update({
      where: { id: existing.id },
      data: update,
      include,
    });
    return map(row, { withChar, withUser });
  }
  const row = await prisma.signup.create({
    data: {
      raidId,
      charId: null,
      userId,
      type: update.type ?? "DPS",
      displayName: update.displayName ?? null,
      saved: update.saved ?? false,
      note: update.note ?? null,
      class: update.class ?? null,
      status: update.status ?? "SIGNUPED",
    },
    include,
  });
  return map(row, { withChar, withUser });
}

/** Partielles Update per ID */
async function update(id, patch = {}, { withChar = false, withUser = false } = {}) {
  const data = {
    userId: patch.userId !== undefined ? (patch.userId == null ? null : String(patch.userId)) : undefined,
    type: patch.type !== undefined ? normType(patch.type) : undefined,
    charId: patch.charId !== undefined ? (patch.charId == null ? null : Number(patch.charId)) : undefined,
    displayName: patch.displayName !== undefined ? toStrOrNull(patch.displayName) : undefined,
    saved: patch.saved !== undefined ? !!patch.saved : undefined,
    note: patch.note !== undefined ? toStrOrNull(patch.note) : undefined,
    class: patch.class !== undefined ? toStrOrNull(patch.class) : undefined,
    status: patch.status !== undefined ? normStatus(patch.status) : undefined,
  };
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  const row = await prisma.signup.update({
    where: { id: Number(id) },
    data,
    include: buildInclude({ withChar, withUser }),
  });
  return map(row, { withChar, withUser });
}

/** Löschen per ID (gibt gelöschten Datensatz zurück) */
async function remove(id) {
  // Vorher holen, damit wir es zurückgeben können
  const existing = await prisma.signup.findUnique({ where: { id: Number(id) } });
  const row = await prisma.signup.delete({
    where: { id: Number(id) },
  });
  return map(existing || row, { withChar: false, withUser: false });
}

/** Löschen per Composite-Key (raidId+charId) – gibt den gelöschten Datensatz zurück */
async function removeByRaidAndChar(raidId, charId) {
  const existing = await prisma.signup.findFirst({
    where: { raidId: Number(raidId), charId: Number(charId) },
  });
  if (!existing) {
    const e = new Error("P2025: Record not found");
    e.code = "P2025";
    throw e;
  }
  await prisma.signup.delete({
    where: { id: existing.id },
  });
  return map(existing, { withChar: false, withUser: false });
}

module.exports = {
  // Reads
  listByRaid,
  listByUser,
  findById,
  findByRaidAndChar,

  // Writes
  create,
  upsertByRaidAndChar,
  update,
  remove,
  removeByRaidAndChar,

  // Konstanten (optional für Controller/Frontend)
  ALLOWED_TYPES,
  ALLOWED_STATUS,
};
