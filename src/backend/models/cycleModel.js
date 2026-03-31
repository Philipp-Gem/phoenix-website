// src/backend/controllers/cyclesController.js
/**
 * Cycles Controller (MVC, nur Model-Aufrufe)
 *
 * Typische Routen (siehe routes/cyclesRoutes.js):
 *  GET    /api/cycles                 → list
 *  GET    /api/cycles/active          → getActive
 *  GET    /api/cycles/:id             → getOne
 *  POST   /api/cycles                 → create         (admin|owner)
 *  PATCH  /api/cycles/:id             → update         (admin|owner)
 *  DELETE /api/cycles/:id             → remove         (admin|owner)
 *  POST   /api/cycles/:id/activate    → activate       (admin|owner)
 *  POST   /api/cycles/:id/deactivate  → deactivate     (admin|owner)
 */

const cycles = require("../models/cycleModel");

/* ----------------------------- Helpers ---------------------------------- */

function requireAuthLocal(req, res) {
  if (!req.user) {
    res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
    return false;
  }
  return true;
}
function isAdminOrOwner(user) {
  return !!user && (user.isOwner || user.isAdmin);
}

/* ---------------------------- Controller -------------------------------- */

/** GET /api/cycles
 * Query:
 *  - q       (name contains)
 *  - active  (true/false)
 *  - from,to (date filter über startDate/endDate – optional, soft)
 *  - sort    (z.B. "startDate:desc" | "createdAt:asc")
 *  - take,skip
 */
async function list(req, res) {
  try {
    const q = req.query || {};
    const where = {};

    if (q.q) where.name = { contains: String(q.q).trim() };

    if (q.active != null) {
      const s = String(q.active).toLowerCase();
      if (["true", "1", "yes", "on"].includes(s)) where.isActive = true;
      else if (["false", "0", "no", "off"].includes(s)) where.isActive = false;
    }

    // optionale Datumshilfen (kein striktes Schema – nur simple Filter)
    const startFilter = {};
    if (q.from) {
      const d = new Date(q.from);
      if (!Number.isNaN(d.getTime())) startFilter.gte = d;
    }
    if (q.to) {
      const d = new Date(q.to);
      if (!Number.isNaN(d.getTime())) startFilter.lte = d;
    }
    if (Object.keys(startFilter).length) {
      where.startDate = Object.assign(where.startDate || {}, startFilter);
    }

    // Sortierung
    const [field = "startDate", dir = "desc"] = String(q.sort || "startDate:desc").split(":");
    const orderBy = [{ [field]: dir.toLowerCase() === "asc" ? "asc" : "desc" }];

    const rows = await cycles.findMany({
      where,
      orderBy,
      take: q.take ? Number(q.take) : undefined,
      skip: q.skip ? Number(q.skip) : undefined,
    });

    return res.json({ ok: true, cycles: rows });
  } catch (e) {
    console.error("[cycles/list] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/cycles/active */
async function getActive(_req, res) {
  try {
    const c = await cycles.findActive();
    return res.json({ ok: true, cycle: c });
  } catch (e) {
    console.error("[cycles/getActive] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** GET /api/cycles/:id */
async function getOne(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const c = await cycles.findById(id);
    if (!c) return res.status(404).json({ ok: false, error: "CYCLE_NOT_FOUND" });
    return res.json({ ok: true, cycle: c });
  } catch (e) {
    console.error("[cycles/getOne] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/cycles  (admin|owner) */
async function create(req, res) {
  if (!requireAuthLocal(req, res)) return;
  if (!isAdminOrOwner(req.user)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  try {
    const payload = {
      name: req.body?.name,
      startDate: req.body?.startDate,
      endDate: req.body?.endDate,
      isActive: req.body?.isActive,
      note: req.body?.note,
    };
    if (!payload.name || !String(payload.name).trim()) {
      return res.status(400).json({ ok: false, error: "NAME_REQUIRED" });
    }
    const saved = await cycles.create(payload);
    return res.status(201).json({ ok: true, cycle: saved });
  } catch (e) {
    console.error("[cycles/create] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** PATCH /api/cycles/:id  (admin|owner) */
async function update(req, res) {
  if (!requireAuthLocal(req, res)) return;
  if (!isAdminOrOwner(req.user)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const patch = {
      name: req.body?.name,
      startDate: req.body?.startDate,
      endDate: req.body?.endDate,
      isActive: req.body?.isActive,
      note: req.body?.note,
    };
    // wenn name als leerer String kommt → Fehler
    if (patch.name !== undefined && !String(patch.name).trim()) {
      return res.status(400).json({ ok: false, error: "NAME_REQUIRED" });
    }

    const saved = await cycles.update(id, patch);
    return res.json({ ok: true, cycle: saved });
  } catch (e) {
    console.error("[cycles/update] error:", e);
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, error: "CYCLE_NOT_FOUND" });
    }
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** DELETE /api/cycles/:id  (admin|owner) */
async function remove(req, res) {
  if (!requireAuthLocal(req, res)) return;
  if (!isAdminOrOwner(req.user)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });

    const deleted = await cycles.remove(id);
    return res.json({ ok: true, cycle: deleted });
  } catch (e) {
    console.error("[cycles/remove] error:", e);
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, error: "CYCLE_NOT_FOUND" });
    }
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/cycles/:id/activate  (admin|owner) */
async function activate(req, res) {
  if (!requireAuthLocal(req, res)) return;
  if (!isAdminOrOwner(req.user)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const saved = await cycles.setActive(id, true);
    return res.json({ ok: true, cycle: saved });
  } catch (e) {
    console.error("[cycles/activate] error:", e);
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, error: "CYCLE_NOT_FOUND" });
    }
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/** POST /api/cycles/:id/deactivate  (admin|owner) */
async function deactivate(req, res) {
  if (!requireAuthLocal(req, res)) return;
  if (!isAdminOrOwner(req.user)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "INVALID_ID" });
    const saved = await cycles.setActive(id, false);
    return res.json({ ok: true, cycle: saved });
  } catch (e) {
    console.error("[cycles/deactivate] error:", e);
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, error: "CYCLE_NOT_FOUND" });
    }
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  list,
  getActive,
  getOne,
  create,
  update,
  remove,
  activate,
  deactivate,
};
