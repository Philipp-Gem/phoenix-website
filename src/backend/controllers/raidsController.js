// src/backend/controllers/raidsController.js
/**
 * Raids Controller (CRUD ohne Signup/Pick)
 * - Reads laufen über Service (liefert leadDisplayName)
 * - Writes nutzen das Model, anschließend wird der Read-Response angereichert zurückgegeben
 */

const raidService = require("../services/raidService.js");
const raids = require("../models/raidModel.js");

// ✨ Cycle-Window (Mi 08:00 → Mi 07:00)
const { getCurrentCycleWindow, getNextCycleWindow } = require("../utils/cycleWindow");

// Discord-Bot (failsafe, wenn nicht verfügbar)
let discordBot = null;
try {
  discordBot = require("../discord-bot");
} catch {
  discordBot = { init: async () => false, syncRaid: async () => null };
}

/* ------------------------------ Helpers -------------------------------- */

const DEFAULT_INSTANCE = "Manaforge";

function normStr(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function isLeadOrAdminOrOwner(user) {
  if (!user) return false;
  return !!(user.isOwner || user.isAdmin || user.isRaidlead);
}

/** "Manaforge Heroic VIP" | "Manaforge Mythic VIP 3/8" */
function buildAutoTitle({ instance = DEFAULT_INSTANCE, difficulty = "Heroic", lootType = "vip", bosses }) {
  const diffLabel =
    difficulty?.toLowerCase() === "mythic" ? "Mythic"
    : difficulty?.toLowerCase() === "normal" ? "Normal"
    : "Heroic";

  const lootLabel =
    (lootType || "").toLowerCase() === "saved"     ? "Saved"
    : (lootType || "").toLowerCase() === "unsaved" ? "UnSaved"
    : "VIP";

  if (diffLabel === "Mythic") {
    const b = Number.isFinite(Number(bosses)) ? Number(bosses) : 0;
    const safe = Math.max(1, Math.min(8, b));
    return `${instance} Mythic ${lootLabel} ${safe}/8`;
  }
  return `${instance} ${diffLabel} ${lootLabel}`;
}

/* ------------------------------ Controller ----------------------------- */

/** GET /api/raids */
async function list(_req, res) {
  try {
    // Preset im Listing nur laden, wenn du es brauchst – hier: mitladen
    const rows = await raidService.list({ orderBy: [{ date: "asc" }, { id: "asc" }], withPreset: true });
    return res.json({ ok: true, raids: rows });
  } catch (e) {
    console.error("[raids/list]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/raids/:id */
async function getOne(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: "INVALID_ID", message: "Ungültige Raid-ID." });
    }
    const raid = await raidService.getById(id); // lädt Preset & leadDisplayName
    if (!raid) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Raid wurde nicht gefunden." });
    return res.json({ ok: true, raid });
  } catch (e) {
    console.error("[raids/getOne]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/raids */
async function create(req, res) {
  try {
    if (!isLeadOrAdminOrOwner(req.user)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Keine Berechtigung einen Raid zu erstellen." });
    }

    const instance   = normStr(req.body?.instance) || DEFAULT_INSTANCE;
    const difficulty = normStr(req.body?.difficulty) || "Heroic"; // Normal|Heroic|Mythic
    const lootType   = normStr(req.body?.lootType)   || "vip";    // saved|unsaved|vip
    const lead       = normStr(req.body?.lead) || req.user?.discordId || null;

    // Datum parsen
    let date = req.body?.date ? new Date(req.body.date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return res.status(400).json({ ok: false, error: "INVALID_DATE", message: "Ungültiges Datum." });
    }

    // ✨ Cycle-Validierung (Mi 08:00 → Mi 07:00), nur aktueller ODER nächster Cycle
    const now = new Date();
    if (date.getTime() < now.getTime()) {
      return res.status(400).json({ ok: false, error: "DATE_PAST", message: "Das ausgewählte Datum liegt in der Vergangenheit." });
    }
    const { start: curStart, end: curEnd } = getCurrentCycleWindow(now);
    const { end: nextEnd } = getNextCycleWindow(now);
    // erlaubt: [curStart, nextEnd)
    if (date < curStart || date >= nextEnd) {
      return res.status(400).json({
        ok: false,
        error: "DATE_OUTSIDE_ALLOWED_CYCLES",
        message: "Datum liegt außerhalb des erlaubten Fensters. Erlaubt sind nur Termine im aktuellen oder im nächsten Cycle.",
        bounds: {
          currentCycleStart: curStart.toISOString(),
          currentCycleEnd:   curEnd.toISOString(),
          nextCycleEnd:      nextEnd.toISOString(),
        },
      });
    }

    // Bosse
    let bosses = difficulty.toLowerCase() === "mythic" ? Number(req.body?.bosses ?? 0) : 8;
    if (difficulty.toLowerCase() === "mythic") {
      if (!Number.isFinite(bosses) || bosses < 1 || bosses > 8) {
        return res.status(400).json({ ok: false, error: "INVALID_BOSSES", message: "Die Anzahl der Bosse ist ungültig (1–8 bei Mythic)." });
      }
    } else {
      bosses = 8;
    }

    // Titel ggf. automatisch
    let title = normStr(req.body?.title);
    if (!title) title = buildAutoTitle({ instance, difficulty, lootType, bosses });

    const payload = {
      title,
      difficulty,
      lootType: lootType.toLowerCase(),
      bosses,
      date,
      lead,
      presetId: req.body?.presetId ?? null,
    };
    const saved = await raids.create(payload);

    // Discord Bot sync (nicht kritisch)
    try { await discordBot.syncRaid(saved); } catch (e) { console.warn("[discord/syncRaid:create]", e?.message || e); }

    // ✨ Enrich für konsistenten Response
    const enriched = await raidService.getById(saved.id);
    return res.status(201).json({ ok: true, raid: enriched });
  } catch (e) {
    console.error("[raids/create]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** PATCH /api/raids/:id */
async function update(req, res) {
  try {
    if (!isLeadOrAdminOrOwner(req.user)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Keine Berechtigung diesen Raid zu bearbeiten." });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: "INVALID_ID", message: "Ungültige Raid-ID." });
    }

    const patch = {};
    const p = req.body || {};

    if (p.title != null)      patch.title      = normStr(p.title) || undefined;
    if (p.difficulty != null) patch.difficulty = normStr(p.difficulty);
    if (p.lootType != null)   patch.lootType   = normStr(p.lootType)?.toLowerCase();
    if (p.lead != null)       patch.lead       = normStr(p.lead) || null;
    if (p.presetId !== undefined) patch.presetId = p.presetId ?? null;

    if (p.date != null) {
      const d = new Date(p.date);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ ok: false, error: "INVALID_DATE", message: "Ungültiges Datum." });
      }
      patch.date = d;
    }

    if (p.bosses != null) {
      const b = Number(p.bosses);
      if (!Number.isFinite(b) || b < 0 || b > 8) {
        return res.status(400).json({ ok: false, error: "INVALID_BOSSES", message: "Die Anzahl der Bosse ist ungültig (0–8)." });
      }
      patch.bosses = b;
    }

    // Titel neu generieren, wenn relevante Felder geändert wurden und kein Titel direkt gesetzt ist
    if (!patch.title && (patch.difficulty || patch.lootType || patch.bosses)) {
      const current = await raids.findOne(id);
      if (!current) return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Raid wurde nicht gefunden." });
      const merged = {
        instance: DEFAULT_INSTANCE,
        difficulty: patch.difficulty || current.difficulty,
        lootType: patch.lootType || current.lootType,
        bosses: (patch.difficulty || current.difficulty).toLowerCase() === "mythic"
          ? (patch.bosses ?? current.bosses ?? 0) : 8,
      };
      patch.title = buildAutoTitle(merged);
    }

    const saved = await raids.update(id, patch);
    try { await discordBot.syncRaid(saved); } catch (e) { console.warn("[discord/syncRaid:update]", e?.message || e); }

    // ✨ Enrich für konsistenten Response
    const enriched = await raidService.getById(saved.id);
    return res.json({ ok: true, raid: enriched });
  } catch (e) {
    console.error("[raids/update]", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Raid wurde nicht gefunden." });
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** DELETE /api/raids/:id */
async function remove(req, res) {
  try {
    if (!isLeadOrAdminOrOwner(req.user)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Keine Berechtigung diesen Raid zu löschen." });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: "INVALID_ID", message: "Ungültige Raid-ID." });
    }
    await raids.remove(id);
    return res.json({ ok: true });
  } catch (e) {
    console.error("[raids/remove]", e);
    if (e?.code === "P2025") return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Raid wurde nicht gefunden." });
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  _buildAutoTitle: buildAutoTitle,
};
