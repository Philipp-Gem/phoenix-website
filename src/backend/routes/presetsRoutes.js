// src/backend/routes/presetsRoutes.js
const express = require("express");
const path = require("path");
const router = express.Router();

const ctrl = require("../controllers/presetsController.js");
const { attachUser } = require(path.join(__dirname, "../middlewares/auth.js"));

router.use(express.json());
router.use(attachUser);

// Lesen darf jeder eingeloggte User (falls du magst, remove attachUser und erlaube public)
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);

// Schreiben nur Lead/Admin/Owner – Guard liegt im Controller
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = { basePath: "/presets", router };
