// src/backend/routes/cronRoutes.js
// Admin-API: Status, Sofort-Run (mit limit/staleMs), Start/Stop

const express = require("express");
const path = require("path");
const { runOnce, start, stop, status } = require("../jobs/charRefreshJob.js");

const router = express.Router();
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

router.use(express.json());
router.use(attachUser);
router.use(requireAuth);

function requireAdmin(req, res, next) {
  if (req.user?.isAdmin || req.user?.isOwner || req.user?.roleLevel >= 3) return next();
  return res.status(403).json({ ok: false, error: "FORBIDDEN" });
}

router.get("/char-refresh/status", requireAdmin, (_req, res) => {
  res.json({ ok: true, job: status() });
});

router.post("/char-refresh/run", requireAdmin, async (req, res) => {
  // Query-Overrides für Tests: ?limit=200&staleMs=0
  const limit = req.query.limit ?? req.body?.limit;
  const staleMs = req.query.staleMs ?? req.body?.staleMs;
  const out = await runOnce({
    ...(limit !== undefined ? { limit: Number(limit) } : {}),
    ...(staleMs !== undefined ? { staleMs: Number(staleMs) } : {}),
  });
  res.status(out.ok ? 200 : 500).json(out);
});

router.post("/char-refresh/start", requireAdmin, (req, res) => {
  const ms = Number(req.query.intervalMs || req.body?.intervalMs || 0) || undefined;
  const out = start(ms);
  res.json({ ok: true, started: out, job: status() });
});

router.post("/char-refresh/stop", requireAdmin, (_req, res) => {
  stop();
  res.json({ ok: true, job: status() });
});

// Auto-Start via ENV
if (String(process.env.CHAR_REFRESH_ENABLE || "false").toLowerCase() === "true") {
  const ms = Number(process.env.CHAR_REFRESH_INTERVAL_MS || 0) || undefined;
  start(ms);
  console.log(`[CRON] Char-Refresh gestartet (Interval=${ms || "default"})`);
}

module.exports = {
  basePath: "/cron",
  router,
};
