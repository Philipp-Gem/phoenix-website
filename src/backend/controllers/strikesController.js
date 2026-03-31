// src/backend/controllers/strikesController.js
const strikeService = require("../services/strikeService");

function requireOwnerOrAdmin(req, res) {
  const u = req?.user;
  return !!(u && (u.isOwner || u.isAdmin));
}

async function list(req, res) {
  try {
    if (!requireOwnerOrAdmin(req, res)) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const userId = req.query.userId || null;
    const activeOnly = req.query.active === "1" || req.query.active === "true";

    if (userId) {
      const strikes = await strikeService.listByUser(userId, { activeOnly });
      return res.json({ ok: true, strikes });
    }
    const strikes = await strikeService.listAll({ activeOnly, take: 500 });
    return res.json({ ok: true, strikes });
  } catch (e) {
    console.error("[strikes/list]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function create(req, res) {
  try {
    if (!requireOwnerOrAdmin(req, res)) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const { userId, reason, weight, expiresAt } = req.body || {};
    if (!userId || !reason) return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });

    const created = await strikeService.addStrike({
      userId,
      reason: String(reason).trim(),
      weight: Number(weight) || 1,
      expiresAt: expiresAt || null,
      actorId: req?.user?.discordId || null,
    });

    return res.json({ ok: true, strike: created });
  } catch (e) {
    console.error("[strikes/create]", e);
    const code = e.message === "USER_NOT_FOUND" ? 404 : 500;
    return res.status(code).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

async function update(req, res) {
  try {
    if (!requireOwnerOrAdmin(req, res)) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const { reason, weight, expiresAt } = req.body || {};
    const updated = await strikeService.updateStrike(id, { reason, weight, expiresAt }, { actorId: req?.user?.discordId || null });

    return res.json({ ok: true, strike: updated });
  } catch (e) {
    console.error("[strikes/update]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function remove(req, res) {
  try {
    if (!requireOwnerOrAdmin(req, res)) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const removed = await strikeService.removeStrike(id, { actorId: req?.user?.discordId || null });
    return res.json({ ok: true, strike: removed });
  } catch (e) {
    console.error("[strikes/remove]", e);
    const code = e.message === "NOT_FOUND" ? 404 : 500;
    return res.status(code).json({ ok: false, error: e.message || "SERVER_ERROR" });
  }
}

module.exports = { list, create, update, remove };
