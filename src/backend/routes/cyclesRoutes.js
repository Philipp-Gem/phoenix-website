// src/backend/routes/cyclesRoutes.js
/**
 * Cycles-Routen (read-only)
 * - Wir berechnen Zyklen zentral in utils/cycles.js
 * - Keine DB, kein Model – nur Utility-Aufruf.
 *
 * Endpunkte:
 *   GET /api/cycles/current  → liefert Start/Ende + Labels des aktuellen Zyklus
 */

const express = require("express");
const { attachUser } = require("../middlewares/auth.js");

let cyclesUtil;
try {
  // Erwartet Funktionen wie: getCurrentCycle(), inCycle(date), etc.
  cyclesUtil = require("../utils/cycles.js");
} catch (e) {
  console.warn("[cyclesRoutes] utils/cycles.js konnte nicht geladen werden:", e?.message);
  cyclesUtil = {};
}

const router = express.Router();
router.use(attachUser);

/**
 * GET /api/cycles/current
 * Antwort (Beispiel):
 * {
 *   ok: true,
 *   cycle: {
 *     start: "2025-10-06T06:00:00.000Z",
 *     end:   "2025-10-13T05:59:59.999Z",
 *     label: "KW 41 / 2025-10-06 → 2025-10-13",
 *     week:  41
 *   }
 * }
 */
router.get("/cycles/current", (req, res) => {
  try {
    if (typeof cyclesUtil.getCurrentCycle !== "function") {
      return res.status(501).json({ ok: false, error: "CYCLE_UTIL_NOT_IMPLEMENTED" });
    }
    const cycle = cyclesUtil.getCurrentCycle(); // sollte ein { start, end, label, week } o.ä. liefern
    return res.json({ ok: true, cycle });
  } catch (e) {
    console.error("[GET /cycles/current] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = {
  basePath: "/cycles",
  router,
};
