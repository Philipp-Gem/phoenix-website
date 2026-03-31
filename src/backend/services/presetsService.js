// src/backend/services/presetsService.js
const { prisma } = require("../prismaClient.js");

function toIntOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function sanitizePayload(p) {
  return {
    name: String(p.name || "").trim(),
    tanks: toIntOrZero(p.tanks),
    healers: toIntOrZero(p.healers),
    dps: toIntOrZero(p.dps),
    lootbuddies: toIntOrZero(p.lootbuddies),
  };
}

exports.list = async () => {
  const rows = await prisma.preset.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return rows;
};

exports.get = async (id) => {
  return prisma.preset.findUnique({ where: { id: Number(id) } });
};

exports.create = async (payload) => {
  const data = sanitizePayload(payload);
  if (!data.name) {
    const e = new Error("name_required");
    e.status = 400;
    throw e;
  }
  return prisma.preset.create({ data });
};

exports.update = async (id, payload) => {
  const data = sanitizePayload(payload);
  if (!data.name) {
    const e = new Error("name_required");
    e.status = 400;
    throw e;
  }
  return prisma.preset.update({
    where: { id: Number(id) },
    data,
  });
};

exports.remove = async (id) => {
  return prisma.preset.delete({ where: { id: Number(id) } });
};
