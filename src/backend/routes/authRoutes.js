// src/backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const { attachUser } = require("../middlewares/auth.js");
const ctrl = require("../controllers/authController.js");

function noCache(_req, res, next) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
}

router.use(attachUser);

// ✅ beide Login-Pfade bedienen
router.get("/login", noCache, ctrl.start);
router.get("/discord/login", noCache, ctrl.start);
router.get("/discord", noCache, ctrl.start);

// Callback von Discord
router.get("/callback", ctrl.callback);

// Session-Check
router.get("/session", noCache, ctrl.session);

// Logout als GET und POST anbieten
router.get("/logout", ctrl.logout);
router.post("/logout", ctrl.logout);

module.exports = { basePath: "/auth", router };
