// src/backend/controllers/signupsController.js
/**
 * Signups Controller (MVC)
 *
 * Routen: src/backend/routes/signupsRoutes.js
 *   GET    /api/raids/:raidId/signups             → listForRaid
 *   DELETE /api/raids/:raidId/signups/:charId     → removeByRaidAndChar
 *   GET    /api/signups/my                        → listMine
 *   GET    /api/signups/:id                       → getOne
 *   POST   /api/signups                           → create
 *   PUT    /api/signups/upsert                    → upsertByKey
 *   PATCH  /api/signups/:id                       → update
 *   DELETE /api/signups/:id                       → remove
 *   POST   /api/signups/:id/pick                  → pick
 *   DELETE /api/signups/:id/pick                  → unpick
 *   POST   /api/raids/:raidId/picks/:signupId     → pickByRaidPath (Alias)
 *   DELETE /api/raids/:raidId/picks/:signupId     → unpickByRaidPath (Alias)
 */

const signupSvc = require("../services/signupService");
const signups = require("../models/signupModel");
const raids = require("../models/raidModel");
const chars = require("../models/charModel");

// 👉 Cycle (Mi 08:00 → Mi 07:00)
const { getCycleWindowFor } = require("../utils/cycleWindow");
const { prisma } = require("../prismaClient.js");

// optionaler Bot-Sync
let discordBot = null;
try { discordBot = require("../discord-bot"); } catch { discordBot = { syncRaid: async () => null }; }

/* ----------------------------- Helpers ---------------------------------- */

function requireAuthLocal(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}
function isLead(u) {
  return !!u && (u.isRaidlead || u.isAdmin || u.isOwner);
}
async function ensureOwnCharOrLead(reqUser, charId) {
  if (isLead(reqUser)) return true;
  if (!charId) return true;
  const c = await chars.findById(charId);
  if (!c) return { notFound: true };
  return String(c.userId) === String(reqUser.discordId);
}

/**
 * Cycle-Duplikat-Prüfung für PICKED (wird weiterhin in create/update genutzt):
 * Char darf im selben Cycle UND in derselben Difficulty nicht bereits in anderem Raid PICKED sein.
 */
async function assertNoPickedDuplicateInCycle({ targetRaidId, charId, excludeSignupId }) {
  if (!charId) return;
  const targetRaid = await raids.findById(targetRaidId, { withCounts: false, withPreset: false });
  if (!targetRaid || !targetRaid.date) {
    const e = new Error("RAID_NOT_FOUND");
    e.code = "VALIDATION";
    throw e;
  }
  const { start, end } = getCycleWindowFor(new Date(targetRaid.date));
  const targetDiff = String(targetRaid.difficulty || "").toUpperCase();

  const existing = await prisma.signup.findFirst({
    where: {
      charId: Number(charId),
      status: "PICKED",
      raid: {
        date: { gte: start, lt: end },
        difficulty: targetDiff,
      },
      ...(excludeSignupId ? { NOT: { id: Number(excludeSignupId) } } : {}),
    },
    select: { id: true, raidId: true },
  });

  if (existing && Number(existing.raidId) !== Number(targetRaidId)) {
    const err = new Error("CHAR_ALREADY_PICKED_IN_CYCLE_SAME_DIFFICULTY");
    err.code = "CYCLE_CONFLICT";
    err.meta = { conflictSignupId: existing.id, conflictRaidId: existing.raidId, cycleStart: start, cycleEnd: end, difficulty: targetDiff };
    throw err;
  }
}

/**
 * 90-Minuten-Zeitfenster nur zwischen verschiedenen Raids (pro User).
 * Booster+Lootbuddy im selben Raid ist erlaubt.
 */
async function assertNoTimeConflict90MinDifferentRaid({ targetRaidId, userId }) {
  const target = await raids.findById(targetRaidId, { withCounts: false, withPreset: false });
  if (!target || !target.date) return;

  const targetDate = new Date(target.date).getTime();
  const windowMs = 90 * 60 * 1000;

  const others = await prisma.signup.findMany({
    where: { userId: String(userId || ""), status: "PICKED" },
    select: { id: true, raidId: true, raid: { select: { date: true } } },
  });

  for (const o of others) {
    if (Number(o.raidId) === Number(targetRaidId)) continue; // gleicher Raid darf kombiniert werden
    const d = o.raid?.date ? new Date(o.raid.date).getTime() : null;
    if (!d) continue;
    if (Math.abs(d - targetDate) <= windowMs) {
      const err = new Error("TIME_CONFLICT_90_MIN");
      err.code = "TIME_CONFLICT_90_MIN";
      err.meta = { existingRaidId: o.raidId, newRaidId: targetRaidId };
      throw err;
    }
  }
}

function isBoostRole(t) {
  const v = String(t || "").toUpperCase();
  return v === "TANK" || v === "HEAL" || v === "HEALER" || v === "DPS" || v === "BOOSTER";
}
function isLootRole(t) {
  const v = String(t || "").toUpperCase();
  return v === "LOOT" || v === "LOOTBUDDY";
}

/* ------------------------------ Controller ------------------------------ */

/** GET /api/raids/:raidId/signups (public read) */
async function listForRaid(req, res) {
  try {
    const raidId = Number(req.params.raidId);
    if (!Number.isFinite(raidId)) {
      return res.status(400).json({ ok: false, error: "INVALID_RAID_ID" });
    }
    const rows = await signupSvc.listByRaid(raidId);
    return res.json({ ok: true, signups: rows });
  } catch (e) {
    console.error("[signups/listForRaid] error:", e);
    const status = e.status || 500;
    return res.status(status).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

/** DELETE /api/raids/:raidId/signups/:charId (auth) */
async function removeByRaidAndChar(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const raidId = Number(req.params.raidId);
    const charId = Number(req.params.charId);
    if (!Number.isFinite(raidId) || !Number.isFinite(charId)) {
      return res.status(400).json({ ok: false, error: "INVALID_IDS" });
    }

    const signup = await prisma.signup.findUnique({
      where: { raidId_charId: { raidId, charId } },
      select: { id: true, userId: true, raidId: true },
    });
    if (!signup) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    const raid = await raids.findById(raidId, { withCounts: false, withPreset: false });
    if (!raid) return res.status(404).json({ ok: false, error: "RAID_NOT_FOUND" });

    const isSelf = String(signup.userId || "") === String(req.user.discordId || "");
    const isAdminOwner = !!(req.user?.isAdmin || req.user?.isOwner);
    const isLeadOfRaid = !!(req.user?.isRaidlead) && String(raid.lead || "") === String(req.user.discordId || "");

    if (!(isSelf || isAdminOwner || isLeadOfRaid)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    await prisma.signup.delete({ where: { id: signup.id } });
    try { await discordBot.syncRaid(raidId); } catch {}

    return res.json({ ok: true, deleted: true });
  } catch (e) {
    console.error("[signups/removeByRaidAndChar] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/signups/my (auth) */
async function listMine(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const rows = await signups.listByUser(req.user.discordId, { withChar: true, withUser: false });
    return res.json({ ok: true, signups: rows });
  } catch (e) {
    console.error("[signups/listMine] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/signups/:id (auth) */
async function getOne(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const row = await signups.findById(id, { withChar: true, withUser: true });
    if (!row) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    if (!isLead(req.user) && String(row.userId || "") !== String(req.user.discordId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    return res.json({ ok: true, signup: row });
  } catch (e) {
    console.error("[signups/getOne] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/signups (auth) – via Service */
async function create(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const body = req.body || {};
    const isPicker = isLead(req.user);

    const ownOk = await ensureOwnCharOrLead(req.user, body.charId);
    if (ownOk?.notFound) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!ownOk) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    // Nur Leads/Admin/Owner dürfen PICKED erzwingen
    let status = body.status;
    if (!isPicker && String(status || "").toUpperCase() === "PICKED") {
      status = "SIGNUPED";
    }

    if (String(status || "").toUpperCase() === "PICKED" && body.raidId) {
      await assertNoPickedDuplicateInCycle({ targetRaidId: body.raidId, charId: body.charId });
    }

    const created = await signupSvc.create({
      raidId: body.raidId,
      userId: body.userId || req.user.discordId,
      type: body.type,
      charId: body.charId ?? null,
      displayName: body.displayName ?? req.user.displayName ?? req.user.username ?? null,
      saved: !!body.saved,
      note: body.note,
      class: body.class,
      status,
    });

    return res.status(201).json({ ok: true, signup: created });
  } catch (e) {
    const status = e.status || (e.code === "CYCLE_CONFLICT" ? 409 : 500);
    console.error("[signups/create] error:", e);
    return res.status(status).json({ ok: false, error: e.message || "SERVER_ERROR", meta: e.meta });
  }
}

/** PUT /api/signups/upsert (auth) */
async function upsertByKey(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const body = req.body || {};
    const isPicker = isLead(req.user);

    const ownOk = await ensureOwnCharOrLead(req.user, body.charId);
    if (ownOk?.notFound) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!ownOk) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    let desiredStatus = body.status;
    if (!isPicker && String(desiredStatus || "").toUpperCase() === "PICKED") {
      desiredStatus = "SIGNUPED";
    }
    if (String(desiredStatus || "").toUpperCase() === "PICKED" && body.charId) {
      await assertNoPickedDuplicateInCycle({ targetRaidId: body.raidId, charId: body.charId });
    }

    const saved = await signups.upsertByRaidAndChar(
      {
        raidId: body.raidId,
        charId: body.charId ?? null,
        userId: body.userId || req.user.discordId,
        type: body.type,
        displayName: body.displayName ?? req.user.displayName ?? req.user.username ?? null,
        saved: !!body.saved,
        note: body.note,
        class: body.class,
        status: desiredStatus,
      },
      { withChar: true, withUser: false }
    );

    return res.json({ ok: true, signup: saved });
  } catch (e) {
    if (e?.code === "VALIDATION") return res.status(400).json({ ok: false, error: e.message });
    if (e?.code === "CYCLE_CONFLICT") return res.status(409).json({ ok: false, error: e.message, meta: e.meta });
    if (e?.code === "P2002") return res.status(409).json({ ok: false, error: "DUPLICATE_SIGNUP" });
    console.error("[signups/upsertByKey] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** PATCH /api/signups/:id (auth) */
async function update(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const current = await signups.findById(id, { withChar: true, withUser: false });
    if (!current) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    const ownOk = await ensureOwnCharOrLead(req.user, current.charId);
    if (ownOk?.notFound) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!ownOk) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const patch = { ...(req.body || {}) };

    // Nur Leads dürfen PICKED setzen
    if (patch.status && !isLead(req.user)) {
      delete patch.status;
    }

    // Falls PICKED → Cycle-Check
    const nextStatus = String(((patch.status ?? current.status) || "")).toUpperCase();
    const nextCharId = patch.charId != null ? Number(patch.charId) : current.charId;
    if (nextStatus === "PICKED" && nextCharId) {
      await assertNoPickedDuplicateInCycle({
        targetRaidId: current.raidId,
        charId: nextCharId,
        excludeSignupId: id,
      });
    }

    const saved = await signups.update(id, patch, { withChar: true, withUser: false });
    return res.json({ ok: true, signup: saved });
  } catch (e) {
    if (e?.code === "CYCLE_CONFLICT") {
      return res.status(409).json({ ok: false, error: e.message, meta: e.meta });
    }
    console.error("[signups/update] error:", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** DELETE /api/signups/:id (auth) */
async function remove(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const row = await signups.findById(id, { withChar: false, withUser: false });
    if (!row) return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });

    const isSelf = row.userId && String(row.userId) === String(req.user.discordId);
    if (!isSelf && !isLead(req.user)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const deleted = await signups.remove(id);
    return res.json({ ok: true, signup: deleted });
  } catch (e) {
    console.error("[signups/remove] error:", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "SIGNUP_NOT_FOUND" });
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* --------------------------- Pick / Unpick ------------------------------ */

/** POST /api/signups/:id/pick */
async function pick(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok:false, error:"INVALID_ID" });

    const s = await signups.findById(id, { withChar: true, withUser: false });
    if (!s) return res.status(404).json({ ok:false, error:"SIGNUP_NOT_FOUND" });

    const raid = await raids.findById(s.raidId, { withCounts:false, withPreset:false });
    if (!raid) return res.status(404).json({ ok:false, error:"RAID_NOT_FOUND" });

    const canPick = isLead(req.user) && (req.user.isAdmin || req.user.isOwner || String(raid.lead || "") === String(req.user.discordId || ""));
    if (!canPick) return res.status(403).json({ ok:false, error:"FORBIDDEN" });

    // 1) genau 1 Booster pro Raid/User (Lootbuddy beliebig)
    if (!isLootRole(s.type)) {
      const already = await prisma.signup.findFirst({
        where: {
          raidId: s.raidId,
          userId: String(s.userId || ""),
          status: "PICKED",
          type: { in: ["TANK","HEAL","HEALER","DPS","BOOSTER"] },
          NOT: { id: Number(s.id) },
        },
        select: { id: true },
      });
      if (already) {
        return res.status(409).json({ ok:false, error:"ALREADY_BOOSTER_IN_RAID" });
      }
    }

    // 2) 90-Minuten-Kollision zwischen verschiedenen Raids (pro User)
    await assertNoTimeConflict90MinDifferentRaid({ targetRaidId: s.raidId, userId: s.userId });

    // Persistieren
    const saved = await signups.update(id, { saved: true, status: "PICKED" }, { withChar:true, withUser:false });

    // Discord nur Embed aktualisieren
    try { await discordBot.syncRaid(s.raidId); } catch {}

    return res.json({ ok:true, signup:saved });
  } catch (e) {
    if (e?.code === "TIME_CONFLICT_90_MIN") {
      return res.status(409).json({ ok:false, error:e.message, code:e.code, meta:e.meta });
    }
    console.error("[signups/pick] error:", e);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}

/** DELETE /api/signups/:id/pick */
async function unpick(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok:false, error:"INVALID_ID" });

    const s = await signups.findById(id, { withChar: false, withUser: false });
    if (!s) return res.status(404).json({ ok:false, error:"SIGNUP_NOT_FOUND" });

    const raid = await raids.findById(s.raidId, { withCounts:false, withPreset:false });
    if (!raid) return res.status(404).json({ ok:false, error:"RAID_NOT_FOUND" });

    const canPick = isLead(req.user) && (req.user.isAdmin || req.user.isOwner || String(raid.lead || "") === String(req.user.discordId || ""));
    if (!canPick) return res.status(403).json({ ok:false, error:"FORBIDDEN" });

    const saved = await signups.update(id, { saved: false, status: "SIGNUPED" }, { withChar:true, withUser:false });
    try { await discordBot.syncRaid(s.raidId); } catch {}
    return res.json({ ok:true, signup:saved });
  } catch (e) {
    console.error("[signups/unpick] error:", e);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}

/* ------- Legacy-Aliase (alte Pfade im Stil /raids/:raidId/picks/:signupId) --- */

async function pickByRaidPath(req, res) {
  req.params.id = req.params.signupId; // delegieren
  return pick(req, res);
}
async function unpickByRaidPath(req, res) {
  req.params.id = req.params.signupId; // delegieren
  return unpick(req, res);
}

module.exports = {
  listForRaid,
  removeByRaidAndChar,
  listMine,
  getOne,
  create,
  upsertByKey,
  update,
  remove,
  pick,
  unpick,
  pickByRaidPath,
  unpickByRaidPath,
};
