// src/backend/controllers/presetsController.js
const svc = require("../services/presetsService.js");

function requireAuth(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}

function isLead(u) {
  return !!u && (u.isOwner || u.isAdmin || u.isRaidlead);
}

function requireLead(req, res) {
  if (!requireAuth(req, res)) return false;
  if (!isLead(req.user)) {
    res.status(403).json({ ok: false, error: "FORBIDDEN" });
    return false;
  }
  return true;
}

// GET /api/presets
async function list(_req, res) {
  try {
    const rows = await svc.list();
    return res.json({ ok: true, presets: rows });
  } catch (e) {
    console.error("[presets/list]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// GET /api/presets/:id
async function get(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const row = await svc.get(id);
    if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return res.json({ ok: true, preset: row });
  } catch (e) {
    console.error("[presets/get]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/presets
async function create(req, res) {
  if (!requireLead(req, res)) return;
  try {
    const saved = await svc.create(req.body || {});
    return res.status(201).json({ ok: true, preset: saved });
  } catch (e) {
    const code = e?.status || 500;
    return res.status(code).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

// PATCH /api/presets/:id
async function update(req, res) {
  if (!requireLead(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const saved = await svc.update(id, req.body || {});
    return res.json({ ok: true, preset: saved });
  } catch (e) {
    const code = e?.status || (e?.code === "P2025" ? 404 : 500);
    const msg = e?.code === "P2025" ? "NOT_FOUND" : (e.message || "SERVER_ERROR");
    return res.status(code).json({ ok: false, error: msg });
  }
}

// DELETE /api/presets/:id
async function remove(req, res) {
  if (!requireLead(req, res)) return;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const del = await svc.remove(id);
    return res.json({ ok: true, preset: del });
  } catch (e) {
    const code = e?.status || (e?.code === "P2025" ? 404 : 500);
    const msg = e?.code === "P2025" ? "NOT_FOUND" : (e.message || "SERVER_ERROR");
    return res.status(code).json({ ok: false, error: msg });
  }
}

module.exports = { list, get, create, update, remove };
