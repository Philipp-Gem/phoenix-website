// src/backend/routes/strikesRoutes.js
const express = require("express");
const path = require("path");
const router = express.Router();

const ctrl = require("../controllers/strikesController");
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Alle Strike-Endpoints nur für eingeloggte User; Owner/Admin-Check ist im Controller
router.use(attachUser, requireAuth);

router.get("/", ctrl.list);      // ?userId=...&active=1
router.post("/", ctrl.create);   // { userId, reason, weight?, expiresAt? }
router.put("/:id", ctrl.update); // { reason?, weight?, expiresAt? }
router.delete("/:id", ctrl.remove);

module.exports = {
  basePath: "/strikes",
  router,
};
