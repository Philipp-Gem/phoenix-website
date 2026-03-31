// scripts/unify-sqlite.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..");
const canonical = path.join(root, "prisma", "dev.db");                    // <- EINZIGE WAHRHEIT
const alt = path.join(root, "src", "backend", "prisma", "dev.db");        // <- Duplikat

function exists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function sizeOr0(p) {
  try { return fs.statSync(p).size; } catch { return 0; }
}

fs.mkdirSync(path.dirname(canonical), { recursive: true });

const a = exists(canonical);
const b = exists(alt);

if (!a && !b) {
  console.log("[unify-sqlite] Keine dev.db gefunden. Nichts zu tun.");
  process.exit(0);
}

// Welche Datei ist „besser“? -> Größer = „aktueller“ (grob), sonst canonical bevorzugen
const pick = (a && b)
  ? (sizeOr0(canonical) >= sizeOr0(alt) ? canonical : alt)
  : (a ? canonical : alt);

if (pick !== canonical) {
  fs.copyFileSync(pick, canonical);
  console.log(`[unify-sqlite] ${pick} -> ${canonical} kopiert`);
} else {
  console.log("[unify-sqlite] canonical ist bereits aktuell:", canonical);
}

if (b && alt !== canonical) {
  // Duplikat optional entfernen/umbenennen, damit es nie wieder „aus Versehen“ benutzt wird.
  const backup = alt + ".bak";
  try {
    fs.renameSync(alt, backup);
    console.log("[unify-sqlite] Duplikat umbenannt:", backup);
  } catch (e) {
    console.warn("[unify-sqlite] Konnte Duplikat nicht umbenennen:", e.message);
  }
}

console.log("[unify-sqlite] Fertig. Bitte .env/DATABASE_URL auf prisma/dev.db zeigen lassen.");
