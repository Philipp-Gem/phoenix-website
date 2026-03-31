// src/backend/routes/signupsRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");

const ctrl = require("../controllers/signupsController");
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Alle Routen werden unter /api/signups gemountet → hier KEIN zweites "signups" mehr im Pfad!
router.use(attachUser);

// Raid-bezogene Signups
router.get("/raids/:raidId/signups", ctrl.listForRaid);
router.delete("/raids/:raidId/signups/:charId", requireAuth, ctrl.removeByRaidAndChar);

// Eigene Signups
router.get("/signups/my", requireAuth, ctrl.listMine);

// Signups CRUD (relativ!)
router.get("/:id", requireAuth, ctrl.getOne);
router.post("/", requireAuth, ctrl.create);
router.put("/upsert", requireAuth, ctrl.upsertByKey);
router.patch("/:id", requireAuth, ctrl.update);
router.delete("/:id", requireAuth, ctrl.remove);

// Pick / Unpick (relativ!)
router.post("/:id/pick", requireAuth, ctrl.pick);
router.delete("/:id/pick", requireAuth, ctrl.unpick);

// Legacy-Aliase (Kompatibilität)
router.post("/raids/:raidId/picks/:signupId", requireAuth, ctrl.pickByRaidPath);
router.delete("/raids/:raidId/picks/:signupId", requireAuth, ctrl.unpickByRaidPath);

module.exports = {
  basePath: "/signups",
  router,
};
