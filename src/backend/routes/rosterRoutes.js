// src/backend/routes/rosterRoutes.js
/**
 * POST /api/roster/post
 * - Postet das Roster (picked) in den Raid-Channel
 * - Pingt IMMER alle gepickten User (Discord-Tags)
 * - Keine Rollen-Pings
 */
const express = require("express");
const path = require("path");
const router = express.Router();

const { attachUser, requireAuth, requireRole } = require(path.join(__dirname, "../middlewares/auth.js"));
const DiscordBot = require("../discord-bot");

// Nur eingeloggte
router.use(attachUser);

// Nur Raidlead/Admin (roleLevel >= 1), passe ggf. an
router.post("/post", requireAuth, requireRole(1), async (req, res) => {
  try {
    const raidId = Number(req.body?.raidId || 0);
    if (!raidId) return res.status(400).json({ ok: false, error: "raidId_required" });

    const out = await DiscordBot.postRoster(raidId);
    return res.json({ ok: true, ...out });
  } catch (e) {
    console.error("[POST /roster/post]", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: e?.message || String(e) });
  }
});

// Auto-Mount Export
module.exports = {
  basePath: "/roster",
  router,
};
