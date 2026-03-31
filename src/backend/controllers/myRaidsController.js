// src/backend/controllers/myRaidsController.js
const svc = require("../services/myRaidsService.js");

// /api/my-raids → upcoming + past Buckets zurückgeben
async function listAll(req, res) {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    const data = await svc.getForUser(req.user.discordId);
    return res.json({ ok: true, ...data });
  } catch (e) {
    console.error("[myRaids/listAll] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// /api/my-raids/upcoming
async function listUpcoming(req, res) {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    const { upcoming } = await svc.getForUser(req.user.discordId);
    return res.json({ ok: true, upcoming });
  } catch (e) {
    console.error("[myRaids/listUpcoming] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// /api/my-raids/past
async function listPast(req, res) {
  try {
    if (!req.user) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    const { past } = await svc.getForUser(req.user.discordId);
    return res.json({ ok: true, past });
  } catch (e) {
    console.error("[myRaids/listPast] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = { listAll, listUpcoming, listPast };
