// src/backend/controllers/cyclesController.js
/**
 * Cycles ohne DB-Tabelle:
 * - Fensterlogik: Mi 08:00 → Mi 07:00 (Europe/Berlin)
 * - Filtert Raids per date in das jeweilige Fenster
 */

const { prisma } = require("../prismaClient.js");
const {
  getCurrentCycleWindow,
  getNextCycleWindow,
  TZ,
} = require("../utils/cycleWindow.js");

/* ---------- Helpers ---------- */

function shapeRaid(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    difficulty: r.difficulty,
    lootType: r.lootType,
    date: r.date,
    lead: r.lead ?? null,
    bosses: r.bosses ?? null,

    tanks: r.tanks ?? 0,
    healers: r.healers ?? 0,
    dps: r.dps ?? 0,
    lootbuddies: r.lootbuddies ?? 0,

    channelId: r.channelId ?? null,
    messageId: r.messageId ?? null,

    presetId: r.presetId ?? null,
    detailUrl: `/raids/${r.id}`,
  };
}

async function findRaidsInWindow({ start, end }) {
  const rows = await prisma.raid.findMany({
    where: {
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
  return rows.map(shapeRaid);
}

/* ---------- Controller Actions ---------- */

// GET /api/cycles/window
// -> { ok, now:{start,end,tz}, next:{start,end,tz} }
exports.window = async (_req, res) => {
  try {
    const now = getCurrentCycleWindow();
    const next = getNextCycleWindow();

    res.json({
      ok: true,
      now: { start: now.start, end: now.end, tz: TZ },
      next: { start: next.start, end: next.end, tz: TZ },
    });
  } catch (err) {
    console.error("[CYCLES] window error:", err);
    res.status(500).json({ ok: false, error: "WINDOW_FAILED", message: err?.message || "failed" });
  }
};

// GET /api/cycles/now/raids
exports.raidsNow = async (_req, res) => {
  try {
    const w = getCurrentCycleWindow();
    const raids = await findRaidsInWindow(w);
    res.json({ ok: true, window: { start: w.start, end: w.end, tz: TZ }, raids });
  } catch (err) {
    console.error("[CYCLES] raidsNow error:", err);
    res.status(500).json({ ok: false, error: "NOW_RAIDS_FAILED", message: err?.message || "failed" });
  }
};

// GET /api/cycles/next/raids
exports.raidsNext = async (_req, res) => {
  try {
    const w = getNextCycleWindow();
    const raids = await findRaidsInWindow(w);
    res.json({ ok: true, window: { start: w.start, end: w.end, tz: TZ }, raids });
  } catch (err) {
    console.error("[CYCLES] raidsNext error:", err);
    res.status(500).json({ ok: false, error: "NEXT_RAIDS_FAILED", message: err?.message || "failed" });
  }
};
