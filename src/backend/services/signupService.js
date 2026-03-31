// src/backend/services/signupService.js
/**
 * Signups Service
 * - Wird vom HTTP-Controller und vom Discord-Bot direkt benutzt
 * - Nutzt Prisma direkt (keine Abhängigkeit von signupModel.* Namensvarianten)
 */

const { prisma } = require("../prismaClient.js");
const { getCycleBounds } = require("../utils/cycles");

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function upper(v) { return String(v || "").toUpperCase(); }
function lower(v) { return String(v || "").toLowerCase(); }

function normalizeType(t) {
  const T = upper(t);
  if (T === "TANK" || T === "HEAL" || T === "DPS" || T === "LOOTBUDDY") return T;
  return "DPS";
}

function canManageRaid(actor, raid) {
  if (!actor || !raid) return false;
  return !!(
    actor.isOwner ||
    actor.isAdmin ||
    (actor.isRaidlead && String(raid.lead || "") === String(actor.discordId || ""))
  );
}

// In einem Zyklus (Current/Next) darf ein Char nur in EINEM Raid gepicked sein
async function assertNoPickedDuplicateInCycle({ targetRaidId, charId, excludeSignupId }) {
  if (!charId) return;
  const raid = await prisma.raid.findUnique({
    where: { id: Number(targetRaidId) },
    select: { id: true, date: true },
  });
  if (!raid || !raid.date) return;

  const { start, end } = getCycleBounds(raid.date);
  const existing = await prisma.signup.findFirst({
    where: {
      charId: Number(charId),
      status: "PICKED",
      raid: { date: { gte: start, lt: end } },
      ...(excludeSignupId ? { NOT: { id: Number(excludeSignupId) } } : {}),
    },
    select: { id: true, raidId: true },
  });
  if (existing && Number(existing.raidId) !== Number(targetRaidId)) {
    const err = new Error("CHAR_ALREADY_PICKED_IN_CYCLE");
    err.code = "CYCLE_CONFLICT";
    throw err;
  }
}

// --------------------------------------------------
// Queries
// --------------------------------------------------
async function listByRaid(raidId) {
  const id = Number(raidId);
  if (!Number.isFinite(id)) {
    const e = new Error("INVALID_RAID_ID");
    e.status = 400;
    throw e;
  }

  // 👇 Hier holen wir das itemLevel des Chars direkt mit
  const signups = await prisma.signup.findMany({
    where: { raidId: id },
    include: {
      char: {
        select: {
          id: true,
          name: true,
          realm: true,
          class: true,
          spec: true,
          itemLevel: true, // <= NEU
        },
      },
    },
    orderBy: [{ saved: "desc" }, { createdAt: "asc" }],
  });

  return signups;
}

// --------------------------------------------------
// Mutations (nur das Nötigste; Logik bleibt unverändert)
// --------------------------------------------------
async function create(payload, options = {}) {
  const actor = options.actor || null;

  const raidId = Number(payload.raidId);
  if (!Number.isFinite(raidId)) {
    const e = new Error("INVALID_RAID_ID");
    e.status = 400;
    throw e;
  }

  // Raid holen (für Permission-Check und Zyklus-Regeln)
  const raid = await prisma.raid.findUnique({
    where: { id: raidId },
    select: { id: true, date: true, lead: true },
  });
  if (!raid) {
    const e = new Error("RAID_NOT_FOUND");
    e.status = 404;
    throw e;
  }

  // charId bestimmen
  const charId = payload.charId ? Number(payload.charId) : null;

  // Optional: validieren, dass Char existiert falls angegeben
  let char = null;
  if (charId) {
    char = await prisma.boosterChar.findUnique({
      where: { id: charId },
      select: { id: true, userId: true },
    });
    if (!char) {
      const e = new Error("CHAR_NOT_FOUND");
      e.status = 404;
      throw e;
    }
  }

  // Wenn direkt als PICKED erstellt wird → Zyklus-Duplikat verhindern
  const nextStatus = upper(payload.status || "SIGNUPED");
  const saved = !!payload.saved || nextStatus === "PICKED";
  if (saved && charId) {
    await assertNoPickedDuplicateInCycle({
      targetRaidId: raidId,
      charId,
      excludeSignupId: null,
    });
  }

  // Erstellen
  const created = await prisma.signup.create({
    data: {
      raidId,
      userId: payload.userId || null,
      type: normalizeType(payload.type),
      charId: charId || null,
      displayName: payload.displayName || null,
      saved,
      note: payload.note || null,
      class: payload.class || null,
      status: nextStatus,
    },
  });

  return created;
}

async function remove(signupId, options = {}) {
  const actor = options.actor || null;
  const id = Number(signupId);
  if (!Number.isFinite(id)) {
    const e = new Error("INVALID_SIGNUP_ID");
    e.status = 400;
    throw e;
  }

  const s = await prisma.signup.findUnique({
    where: { id },
    include: {
      raid: { select: { id: true, lead: true } },
    },
  });
  if (!s) {
    const e = new Error("SIGNUP_NOT_FOUND");
    e.status = 404;
    throw e;
  }

  // Owner des Signups oder Raidlead/Admin/Owner darf löschen
  if (actor) {
    const isOwnerOfSignup =
      String(s.userId || "") === String(actor.discordId || "");
    const isLeadOfRaid =
      !!actor.isRaidlead &&
      String(s.raid?.lead || "") === String(actor.discordId || "");
    if (!(actor.isOwner || actor.isAdmin || isOwnerOfSignup || isLeadOfRaid)) {
      const e = new Error("FORBIDDEN");
      e.status = 403;
      throw e;
    }
  }

  await prisma.signup.delete({ where: { id: s.id } });
  return { deleted: true };
}

module.exports = {
  listByRaid,
  create,
  remove,
};
