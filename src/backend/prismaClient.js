// src/backend/prismaClient.js
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const abs = path.resolve(__dirname, "prisma", "dev.db");
  if (!fs.existsSync(abs)) {
    console.warn(`[prismaClient] Fallback-DB nicht gefunden: ${abs}`);
  }
  process.env.DATABASE_URL = "file:" + abs.replace(/\\/g, "/");
}
ensureDatabaseUrl();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["warn", "error"],
});

process.on("beforeExit", async () => {
  try { await prisma.$disconnect(); } catch {}
});

module.exports = { prisma };
