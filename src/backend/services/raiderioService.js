// src/backend/services/raiderioService.js
// Mini-Client für Raider.IO

const fetch = global.fetch || require("node-fetch");

const BASE = "https://raider.io/api/v1/characters/profile";

function slugifyRealm(realm) {
  return String(realm || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, "-");
}

function normalizeName(name) {
  const s = String(name || "").trim();
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
}

function buildUrl({ region = "eu", realm, name, fields = [] }) {
  const params = new URLSearchParams({
    region: String(region || "eu").toLowerCase(),
    realm: slugifyRealm(realm),
    name: normalizeName(name),
  });

  const wanted = fields.length
    ? fields
    : ["gear", "raid_progression", "mythic_plus_scores_by_season:current"];

  params.set("fields", wanted.join(","));
  return `${BASE}?${params.toString()}`;
}

async function fetchProfile({ region = "eu", realm, name, fields = [] }) {
  const url = buildUrl({ region, realm, name, fields });
  const res = await fetch(url, { headers: { "User-Agent": "BoostingBot/1.0" } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`raider_io_${res.status}: ${t || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function toCharFields(json) {
  if (!json) return null;

  // IO-Score
  let rioScore = null;
  if (json.mythic_plus_scores?.all != null) {
    rioScore = Number(json.mythic_plus_scores.all);
  } else if (Array.isArray(json.mythic_plus_scores_by_season) && json.mythic_plus_scores_by_season[0]) {
    const s0 = json.mythic_plus_scores_by_season[0];
    rioScore = s0?.scores?.segments?.all ?? s0?.scores?.all ?? null;
    rioScore = rioScore != null ? Number(rioScore) : null;
  }

  // Itemlevel
  const itemLevel =
    json.gear?.item_level_equipped != null
      ? Number(json.gear.item_level_equipped)
      : null;

  // Raid-Progress (ein “bestes” Summary wählen)
  let progress = null;
  if (json.raid_progression && typeof json.raid_progression === "object") {
    const entries = Object.entries(json.raid_progression)
      .map(([key, v]) => ({ key, ...v }))
      .filter((r) => r?.summary);
    if (entries.length) {
      entries.sort((a, b) => (String(a.summary).includes("Mythic") ? -1 : 1));
      progress = entries[0].summary;
    }
  }

  return {
    name: json.name,
    realm: json.realm,
    class: json.class || null,
    spec: json.active_spec_name || null,
    rioScore: rioScore,
    progress: progress,
    itemLevel: itemLevel,
    wclUrl: null,
  };
}

module.exports = {
  fetchProfile,
  toCharFields,
  slugifyRealm,
  normalizeName,
};
