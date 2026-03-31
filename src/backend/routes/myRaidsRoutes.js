// src/backend/routes/myRaidsRoutes.js
const express = require("express");
const path = require("path");

const router = express.Router();

// Controller (liegt bei euch unter src/backend/controllers/*)
const ctrl = require("../controllers/myRaidsController.js");

// Auth-Middleware (gleicher Pfad wie in signupsRoutes/raidsRoutes)
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js"));

// Session anhängen + Auth erzwingen
router.use(attachUser);
router.use(requireAuth);

// Endpunkte
router.get("/", ctrl.listAll);
router.get("/upcoming", ctrl.listUpcoming);
router.get("/past", ctrl.listPast);

// Wichtig für den Auto-Mounter in server.js: { basePath, router }
module.exports = {
  basePath: "/my-raids",
  router,
};
