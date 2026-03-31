// src/backend/controllers/charsController.js
/**
 * Chars Controller (MVCS)
 * - CREATE/IMPORT nutzt Raider.IO
 * - + Refresh-Endpoints (einzeln / stale)
 */

const svc = require("../services/charService");
const refresher = require("../services/charRefreshService.js");

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
function isAdmin(u) {
  return !!u && (u.isAdmin || u.isOwner || u.roleLevel >= 3);
}
function isSelf(req, discordId) {
  return String(req.user?.discordId || "") === String(discordId || "");
}

/* --------------------------------- GETs --------------------------------- */

async function listMine(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const rows = await svc.listByUser(req.user.discordId);
    return res.json({ ok: true, chars: rows });
  } catch (e) {
    console.error("[chars/listMine] error:", e);
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "SERVER_ERROR" });
  }
}

async function listByUser(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const discordId = String(req.params.discordId || "");
    if (!discordId) return res.status(400).json({ ok: false, error: "discordId_required" });
    if (!isLead(req.user) && !isSelf(req, discordId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    const rows = await svc.listByUser(discordId);
    return res.json({ ok: true, chars: rows });
  } catch (e) {
    console.error("[chars/listByUser] error:", e);
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "SERVER_ERROR" });
  }
}

async function getOne(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const row = await svc.getChar(id);
    if (!row) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!isLead(req.user) && !isSelf(req, row.userId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    return res.json({ ok: true, char: row });
  } catch (e) {
    console.error("[chars/getOne] error:", e);
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "SERVER_ERROR" });
  }
}

/* ------------------------------ Raider.IO -------------------------------- */

async function preview(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const name = String(req.query.name || req.body?.name || "").trim();
    const realm = String(req.query.realm || req.body?.realm || "").trim();
    const region = String(req.query.region || req.body?.region || "eu").trim().toLowerCase();
    if (!name || !realm) return res.status(400).json({ ok: false, error: "name_and_realm_required" });
    const fields = await svc.previewFromRaiderIO({ name, realm, region });
    return res.json({ ok: true, preview: fields });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "preview_failed" });
  }
}

async function importOne(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const name = String(req.body?.name || "").trim();
    const realm = String(req.body?.realm || "").trim();
    const region = String(req.body?.region || "eu").trim().toLowerCase();
    if (!name || !realm) return res.status(400).json({ ok: false, error: "name_and_realm_required" });
    const saved = await svc.importOneForUser({ discordId: req.user.discordId, name, realm, region });
    return res.json({ ok: true, char: saved });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "import_failed" });
  }
}

async function importMany(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const list = Array.isArray(req.body?.list) ? req.body.list : [];
    const region = String(req.body?.region || "eu").trim().toLowerCase();
    if (!list.length) return res.status(400).json({ ok: false, error: "list_required" });
    const results = await svc.importManyForUser({ discordId: req.user.discordId, list, region });
    return res.json({ ok: true, results });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "import_many_failed" });
  }
}

/* -------------------------------- Writes -------------------------------- */

async function create(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const name = String(req.body?.name || "").trim();
    const realm = String(req.body?.realm || "").trim();
    const region = String(req.body?.region || "eu").trim().toLowerCase();
    if (!name || !realm) return res.status(400).json({ ok: false, error: "name_and_realm_required" });
    const saved = await svc.importOneForUser({ discordId: req.user.discordId, name, realm, region });
    return res.status(201).json({ ok: true, char: saved });
  } catch (e) {
    const status = e?.status || 500;
    return res.status(status).json({ ok: false, error: e?.message || "SERVER_ERROR" });
  }
}

async function update(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const current = await svc.getChar(id);
    if (!current) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!isLead(req.user) && !isSelf(req, current.userId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    const patch = { ...(req.body || {}) };
    if (!isLead(req.user)) delete patch.userId;
    const saved = await svc.updateChar(id, patch);
    return res.json({ ok: true, char: saved });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "SERVER_ERROR" });
  }
}

async function remove(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const current = await svc.getChar(id);
    if (!current) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });
    if (!isLead(req.user) && !isSelf(req, current.userId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    const deleted = await svc.deleteChar(id);
    return res.json({ ok: true, char: deleted });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "SERVER_ERROR" });
  }
}

/* ------------------------------ Refresh API ------------------------------ */

async function refreshOne(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const current = await svc.getChar(id);
    if (!current) return res.status(404).json({ ok: false, error: "CHAR_NOT_FOUND" });

    // Nur Owner des Chars oder Lead/Admin
    if (!isLead(req.user) && !isSelf(req, current.userId)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const updated = await refresher.refreshOneById(id);
    return res.json({ ok: true, char: updated });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "refresh_failed" });
  }
}

async function refreshStale(req, res) {
  if (!requireAuthLocal(req, res)) return;
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    const limit = Number(req.query.limit || req.body?.limit || 0) || undefined;
    const results = await refresher.refreshStale(limit);
    return res.json({ ok: true, results });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: e?.message || "refresh_failed" });
  }
}

module.exports = {
  listMine,
  listByUser,
  getOne,
  create,
  update,
  remove,
  preview,
  importOne,
  importMany,
  refreshOne,
  refreshStale,
};
