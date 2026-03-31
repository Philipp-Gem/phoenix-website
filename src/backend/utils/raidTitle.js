// src/backend/utils/raidTitle.js

const DIFF_LABEL = {
  nhc: "NHC",
  hc: "HC",
  mythic: "Mythic",
};

const LOOT_LABEL = {
  saved: "Saved",
  unsaved: "Unsaved",
  vip: "VIP",
};

/**
 * buildRaidTitle({ base, difficulty, lootType, bosses })
 * Beispiele:
 *  - Manaforge HC VIP
 *  - Manaforge Mythic VIP 2/8
 */
function buildRaidTitle({ base = "Manaforge", difficulty, lootType, bosses }) {
  const dKey = String(difficulty || "").toLowerCase();
  const lKey = String(lootType || "").toLowerCase();

  const dLabel = DIFF_LABEL[dKey];
  const lLabel = LOOT_LABEL[lKey];

  if (!dLabel || !lLabel) return base || "Manaforge";

  if (dKey === "mythic") {
    const b = Number(bosses);
    const safe = Number.isFinite(b) ? Math.max(1, Math.min(8, b)) : null;
    return `${base || "Manaforge"} ${dLabel} ${lLabel}${safe ? ` ${safe}/8` : ""}`;
  }

  return `${base || "Manaforge"} ${dLabel} ${lLabel}`;
}

module.exports = { buildRaidTitle };
4