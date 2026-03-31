// src/backend/services/charRefreshService.js
// Aktualisiert Charaktere über Raider.IO; robustes Logging & dynamisches Prisma-Modell.

const { prisma } = require("../prismaClient.js");

const DEFAULT_REGION = (process.env.RIO_REGION_DEFAULT || "eu").toLowerCase();
const DEFAULT_STALE_MS = Number(process.env.CHAR_REFRESH_STALE_MS || 1000 * 60 * 60 * 6);
const DEFAULT_BATCH = Number(process.env.CHAR_REFRESH_BATCH || 10);

// --- Raider.IO fetch ---
function buildRioUrl({ name, realm, region }) {
  const params = new URLSearchParams({
    region,
    realm,
    name,
    fields: "gear,mythic_plus_scores_by_season:current",
  });
  return `https://raider.io/api/v1/characters/profile?${params.toString()}`;
}

async function fetchRioProfile({ name, realm, region }) {
  const url = buildRioUrl({ name, realm, region });
  const res = await fetch(url, { headers: { "user-agent": "boosting-bot/char-refresh" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`RIO ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

function parseRio(profile) {
  const ilvl =
    profile?.gear?.item_level_equipped ??
    profile?.gear?.item_level_total ??
    null;

  let rioScore = null;
  const seasons = Array.isArray(profile?.mythic_plus_scores_by_season)
    ? profile.mythic_plus_scores_by_season
    : [];
  if (seasons.length) {
    const s0 = seasons[0];
    const scores = s0?.scores || s0;
    rioScore = scores?.all ?? scores?.score ?? null;
  }

  return {
    itemLevel: ilvl ? Math.round(ilvl) : null,
    rioScore: rioScore ? Number(rioScore) : null,
    class: profile?.class || null,
    spec: profile?.active_spec_name || null,
  };
}

// --- Prisma Modell dynamisch bestimmen (BoosterChar vs Char) ---
function getCharModel() {
  // ENV-Override erlaubt
  const override = (process.env.PRISMA_CHAR_MODEL || "").trim();
  if (override) {
    const key = override.charAt(0).toLowerCase() + override.slice(1);
    if (prisma[key]?.findMany) return prisma[key];
  }
  if (prisma.boosterChar?.findMany) return prisma.boosterChar; // <- dein Schema
  if (prisma.char?.findMany) return prisma.char;
  throw new Error(
    "Kein passendes Prisma-Modell gefunden. Setze PRISMA_CHAR_MODEL in .env (z.B. BoosterChar oder Char)."
  );
}

function toRegion(_c) {
  // Dein Schema hat kein 'region' Feld -> wir nutzen Default
  return DEFAULT_REGION || "eu";
}

function safe(val, fallback = null) {
  return val === undefined || val === null ? fallback : val;
}

function patchFromRio(rio, current) {
  // Nur Felder verwenden, die es im Schema gibt
  return {
    itemLevel: safe(rio.itemLevel, current.itemLevel ?? null),
    rioScore : safe(rio.rioScore , current.rioScore  ?? null),
    class    : safe(rio.class    , current.class     ?? null),
    spec     : safe(rio.spec     , current.spec      ?? null),
    // KEIN rioSyncedAt – Feld existiert in deinem Schema nicht
  };
}

// --- Public API des Services ---
async function refreshOneById(id) {
  const Char = getCharModel();
  const cur = await Char.findUnique({ where: { id: Number(id) } });
  if (!cur) {
    const e = new Error("CHAR_NOT_FOUND");
    e.status = 404;
    throw e;
  }

  const profile = await fetchRioProfile({
    name: cur.name,
    realm: cur.realm,
    region: toRegion(cur),
  });
  const rio = parseRio(profile);
  const data = patchFromRio(rio, cur);

  const updated = await Char.update({
    where: { id: cur.id },
    data,
    select: {
      id: true, userId: true, name: true, realm: true,
      class: true, spec: true, itemLevel: true, rioScore: true, updatedAt: true,
    },
  });

  return updated;
}

async function findStale(limit = DEFAULT_BATCH, staleMs = DEFAULT_STALE_MS) {
  const Char = getCharModel();

  // Sonderfall: staleMs === 0 => "alles ist stale" (wir holen einfach alle, per Limit begrenzt)
  if (Number(staleMs) === 0) {
    return Char.findMany({
      orderBy: [{ updatedAt: "asc" }],
      take: Number(limit) || DEFAULT_BATCH,
    });
  }

  const cutoff = new Date(Date.now() - staleMs);
  return Char.findMany({
    where: {
      OR: [
        { itemLevel: null },
        { rioScore: null },
        { updatedAt: { lt: cutoff } },
      ],
    },
    orderBy: [{ updatedAt: "asc" }],
    take: Number(limit) || DEFAULT_BATCH,
  });
}

async function refreshStale({ limit, staleMs } = {}) {
  const list = await findStale(limit, staleMs);
  const results = [];

  for (const c of list) {
    try {
      const upd = await refreshOneById(c.id);
      results.push({ ok: true, id: c.id, name: c.name, realm: c.realm, updated: upd });
    } catch (e) {
      results.push({ ok: false, id: c.id, name: c.name, realm: c.realm, error: String(e?.message || e) });
    }
  }
  return results;
}

module.exports = {
  refreshOneById,
  refreshStale,
  findStale,
};
