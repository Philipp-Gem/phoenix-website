// src/backend/routes/usersRoutes.js
// Mount: /api/users

const express = require("express");
const path = require("path");
const router = express.Router();

const ctrl = require("../controllers/usersController.js");
const { attachUser, requireAuth } = require(path.join(__dirname, "../middlewares/auth.js")); // gleiches Muster wie bei Raids

// Helper-Guard: nur Owner/Admin
function requireOwnerOrAdmin(req, res, next) {
  const u = req?.user;
  if (!u) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  if (u.isOwner || u.isAdmin) return next();
  return res.status(403).json({ ok: false, error: "FORBIDDEN" });
}

// Alle Routen bekommen den Session-User
router.use(attachUser);

// /me: immer erreichbar – liefert user=null, wenn nicht eingeloggt
router.get("/me", ctrl.getMe);

// Leads-Liste (öffentlich/oder hinter Auth – bei Bedarf absichern)
router.get("/leads", ctrl.listLeads);

// ✨ Admin-Übersicht inkl. Chars & Historie
router.get("/", requireAuth, requireOwnerOrAdmin, ctrl.listAll);

module.exports = {
  basePath: "/users",
  router,
};
