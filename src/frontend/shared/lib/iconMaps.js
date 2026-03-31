// src/frontend/shared/lib/iconMaps.js
// Zentrale Maps + Helfer zum Auflösen von Klassen- und Rollen-Icons.
// Pfade sind relativ zu diesem File gerechnet: shared/lib -> ../../assets/...

// --- Klassen-Icons ---
import cls_dh from "../../assets/classes/dh.png";
import cls_dk from "../../assets/classes/dk.png";
import cls_druid from "../../assets/classes/druid.png";
import cls_evoker from "../../assets/classes/evoker.png";
import cls_hunter from "../../assets/classes/hunter.png";
import cls_mage from "../../assets/classes/mage.png";
import cls_monk from "../../assets/classes/monk.png";
import cls_paladin from "../../assets/classes/paladin.png";
import cls_priest from "../../assets/classes/priest.png";
import cls_rogue from "../../assets/classes/rogue.png";
import cls_shaman from "../../assets/classes/shaman.png";
import cls_warlock from "../../assets/classes/warlock.png";
import cls_warrior from "../../assets/classes/warrior.png";

// --- Rollen-Icons ---
import role_tank from "../../assets/roles/tank.png";
import role_heal from "../../assets/roles/heal.png";
import role_dps from "../../assets/roles/dps.png";
import role_lootbuddy from "../../assets/roles/lootbuddy.png";
import role_saved from "../../assets/roles/saved.png";
import role_unsaved from "../../assets/roles/unsaved.png";

// ---------- Helpers ----------
const normalize = (s) => String(s || "").trim().toLowerCase();

// Viele Quellen liefern unterschiedliche Schreibweisen – wir normalisieren auf Keys:
function normalizeClassName(name) {
  const n = normalize(name);

  // harte Aliase
  const map = {
    "demon hunter": "dh",
    "dh": "dh",

    "death knight": "dk",
    "dk": "dk",

    "druid": "druid",
    "evoker": "evoker",

    "hunter": "hunter",
    "mage": "mage",
    "monk": "monk",
    "paladin": "paladin",
    "priest": "priest",
    "rogue": "rogue",
    "shaman": "shaman",
    "warlock": "warlock",
    "warrior": "warrior",
  };

  // manche Backends geben z.B. "DemonHunter" / "DeathKnight"
  const compact = n.replace(/\s+/g, "");
  if (compact === "demonhunter") return "dh";
  if (compact === "deathknight") return "dk";

  return map[n] || n;
}

function normalizeRoleName(role) {
  const n = normalize(role);

  // Akzeptiere sowohl Codes als auch Labels
  const map = {
    "tank": "tank",
    "tanks": "tank",

    "heal": "heal",
    "healer": "heal",
    "healers": "heal",

    "dps": "dps",

    "lootbuddy": "lootbuddy",
    "lootbuddies": "lootbuddy",

    "saved": "saved",
    "unsaved": "unsaved",
  };

  return map[n] || n;
}

// ---------- Maps ----------
export const CLASS_ICONS = {
  dh: cls_dh,
  dk: cls_dk,
  druid: cls_druid,
  evoker: cls_evoker,
  hunter: cls_hunter,
  mage: cls_mage,
  monk: cls_monk,
  paladin: cls_paladin,
  priest: cls_priest,
  rogue: cls_rogue,
  shaman: cls_shaman,
  warlock: cls_warlock,
  warrior: cls_warrior,
};

export const ROLE_ICONS = {
  tank: role_tank,
  heal: role_heal,
  dps: role_dps,
  lootbuddy: role_lootbuddy,
  saved: role_saved,
  unsaved: role_unsaved,
};

// ---------- Public API ----------
export function getClassIcon(cls) {
  const key = normalizeClassName(cls);
  return CLASS_ICONS[key] || null; // kein Fallback erzwingen – UI kann dann ohne Icon rendern
}

export function getRoleIcon(role) {
  const key = normalizeRoleName(role);
  return ROLE_ICONS[key] || null;
}

// Optional: hübsche Title/Labels für Tooltips
export function getClassLabel(cls) {
  const key = normalizeClassName(cls);
  const labels = {
    dh: "Demon Hunter",
    dk: "Death Knight",
    druid: "Druid",
    evoker: "Evoker",
    hunter: "Hunter",
    mage: "Mage",
    monk: "Monk",
    paladin: "Paladin",
    priest: "Priest",
    rogue: "Rogue",
    shaman: "Shaman",
    warlock: "Warlock",
    warrior: "Warrior",
  };
  return labels[key] || cls || "";
}

export function getRoleLabel(role) {
  const key = normalizeRoleName(role);
  const labels = {
    tank: "Tank",
    heal: "Healer",
    dps: "DPS",
    lootbuddy: "Lootbuddy",
    saved: "Saved",
    unsaved: "Unsaved",
  };
  return labels[key] || role || "";
}
