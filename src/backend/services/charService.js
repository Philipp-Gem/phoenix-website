// src/backend/services/charService.js
/**
 * Service-Layer für BoosterChar
 * - Raider.IO Preview & Import als Standard
 * - Import überschreibt bestehende Felder nicht mit null
 * - Eindeutigkeit: (userId, name, realm)
 */

const charModel = require("../models/charModel.js");
const { prisma } = require("../prismaClient.js");
const rio = require("./raiderioService.js");

/* --------- Fallbacks auf Prisma, falls dein Model manche Methoden nicht hat */
function ensureModelFallbacks() {
  if (typeof charModel.findMany !== "function") {
    charModel.findMany = async (arg = {}) => {
      const where = arg?.where ? arg.where : arg;
      return prisma.boosterChar.findMany({ where });
    };
  }
  if (typeof charModel.findFirst !== "function") {
    charModel.findFirst = async (arg = {}) => prisma.boosterChar.findFirst(arg);
  }
  if (typeof charModel.findById !== "function") {
    charModel.findById = async (id) =>
      prisma.boosterChar.findUnique({ where: { id: Number(id) } });
  }
  if (typeof charModel.create !== "function") {
    charModel.create = async (data) => prisma.boosterChar.create({ data });
  }
  if (typeof charModel.update !== "function") {
    charModel.update = async (id, data) =>
      prisma.boosterChar.update({ where: { id: Number(id) }, data });
  }
  if (typeof charModel.remove !== "function") {
    charModel.remove = async (id) =>
      prisma.boosterChar.delete({ where: { id: Number(id) } });
  }
}
ensureModelFallbacks();

/* ------------------------------ Hilfen ---------------------------------- */

async function ensureUserExists(discordId, displayMaybe) {
  const id = String(discordId);
  const display = displayMaybe || null;
  await prisma.user.upsert({
    where: { discordId: id },
    update: { ...(display ? { displayName: display } : {}) },
    create: {
      discordId: id,
      username: display,
      displayName: display,
      isRaidlead: false,
      isAdmin: false,
      isOwner: false,
      rolesCsv: null,
      highestRole: null,
      roleLevel: 0,
    },
  });
}

function ciEqual(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

async function findExistingForUserNameRealm(discordId, name, realm) {
  const list = await charModel.findMany({ where: { userId: String(discordId) } });
  return list.find((c) => ciEqual(c.name, name) && ciEqual(c.realm, realm)) || null;
}

/* ------------------------------ Queries --------------------------------- */

exports.listByUser = async (discordId) => {
  return charModel.findMany({ where: { userId: String(discordId) } });
};

exports.getChar = async (id) => charModel.findById(Number(id));
exports.getAll  = async ({ userId } = {}) =>
  userId ? charModel.findMany({ where: { userId: String(userId) } }) : charModel.findMany();
exports.getById = async (id) => charModel.findById(id);

/* --------------------------- Raider.IO & Writes -------------------------- */

/** Pure Raider.IO Preview (ohne DB) */
exports.previewFromRaiderIO = async ({ name, realm, region = "eu" }) => {
  const prof = await rio.fetchProfile({ name, realm, region });
  const fields = rio.toCharFields(prof);
  return fields;
};

/** Import/upsert aus Raider.IO; null-Werte aus RIO löschen keine vorhandenen DB-Werte */
exports.importOneForUser = async ({ discordId, name, realm, region = "eu" }) => {
  if (!discordId) {
    const e = new Error("missing_discordId");
    e.status = 400;
    throw e;
  }
  await ensureUserExists(String(discordId));

  const prof = await rio.fetchProfile({ name, realm, region });
  const fields = rio.toCharFields(prof);
  if (!fields?.name || !fields?.realm) {
    const e = new Error("invalid_char_data");
    e.status = 422;
    throw e;
  }

  const existing = await findExistingForUserNameRealm(discordId, fields.name, fields.realm);

  if (existing) {
    const patch = {
      class:     fields.class     ?? existing.class ?? null,
      spec:      fields.spec      ?? existing.spec  ?? null,
      rioScore:
        fields.rioScore !== undefined && fields.rioScore !== null
          ? Number(fields.rioScore)
          : existing.rioScore ?? null,
      itemLevel:
        fields.itemLevel !== undefined && fields.itemLevel !== null
          ? Number(fields.itemLevel)
          : existing.itemLevel ?? null,
      progress:  fields.progress  ?? existing.progress ?? null,
      // wclUrl kommt nicht aus RIO → nicht überschreiben
      wclUrl:    existing.wclUrl ?? null,
    };
    return charModel.update(existing.id, patch);
  }

  return charModel.create({
    userId: String(discordId),
    ...fields,
  });
};

exports.importManyForUser = async ({ discordId, list = [], region = "eu" }) => {
  const out = [];
  for (const it of list) {
    try {
      const saved = await exports.importOneForUser({
        discordId,
        name: it.name,
        realm: it.realm,
        region: it.region || region,
      });
      out.push({ ok: true, char: saved });
    } catch (e) {
      out.push({
        ok: false,
        error: e?.message || "import_failed",
        name: it?.name,
        realm: it?.realm,
      });
    }
  }
  return out;
};

/* ------------- Legacy create/update/remove bleiben für Sonderfälle -------- */

exports.create = async (data) => {
  // Nicht mehr direkt genutzt (CREATE nutzt jetzt Import).
  // Belassen für Kompatibilität/Backoffice-Fälle.
  if (!data?.userId || !data?.name || !data?.realm) {
    const err = new Error("Missing required fields: userId, name, realm");
    err.status = 400;
    throw err;
  }
  await ensureUserExists(String(data.userId));
  const existing = await charModel.findFirst({
    where: { userId: String(data.userId), name: String(data.name), realm: String(data.realm) },
  });
  if (existing) {
    const err = new Error("Character already exists for this user with same name/realm");
    err.status = 409;
    throw err;
  }
  return charModel.create({
    userId: String(data.userId),
    name: String(data.name),
    realm: String(data.realm),
    class: data.class || null,
    spec: data.spec || null,
    rioScore: data.rioScore != null ? Number(data.rioScore) : null,
    itemLevel: data.itemLevel != null ? Number(data.itemLevel) : null,
    progress: data.progress || null,
    wclUrl: data.wclUrl || null,
  });
};

exports.update = async (id, data) => {
  const current = await charModel.findById(id);
  if (!current) {
    const err = new Error("Character not found");
    err.status = 404;
    throw err;
  }
  const patch = {
    userId: data.userId !== undefined ? String(data.userId) : undefined,
    name: data.name !== undefined ? String(data.name) : undefined,
    realm: data.realm !== undefined ? String(data.realm) : undefined,
    class: data.class !== undefined ? data.class : undefined,
    spec: data.spec !== undefined ? data.spec : undefined,
    rioScore: data.rioScore !== undefined ? Number(data.rioScore) : undefined,
    itemLevel: data.itemLevel !== undefined ? Number(data.itemLevel) : undefined,
    progress: data.progress !== undefined ? data.progress : undefined,
    wclUrl: data.wclUrl !== undefined ? data.wclUrl : undefined,
  };
  return charModel.update(id, patch);
};

exports.remove = async (id) => charModel.remove(id);

/* Aliases */
exports.createChar = exports.create;
exports.updateChar = exports.update;
exports.deleteChar = exports.remove;
