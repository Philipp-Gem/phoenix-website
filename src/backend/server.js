// src/backend/server.js
/* eslint-disable no-console */
const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const cors = require("cors");

// ⚙️ ENV
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || 4000);

// ⚙️ App
const app = express();

// Hinter Plesk/nginx sinnvoll:
app.set("trust proxy", 1);

// ───────────────── Mini-Logger (statt morgan)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Body-Parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sessions (für OAuth)
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // wie bei dir lokal: kein Secure-Flag erzwungen
      // (hinter Plesk/HTTPS ist das trotzdem okay)
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
    },
  })
);

// CORS defensiv erlauben (Frontend dev ggf. andere Origin)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ───────────────── Dynamic Router Mounting (GENAU 1 Mount je Router)
function mountRouters() {
  const routesDir = path.join(__dirname, "routes");
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith("Routes.js"));

  for (const file of files) {
    const full = path.join(routesDir, file);
    try {
      // Jeder Router exportiert: { basePath: "/raids", router }
      const mod = require(full);
      const basePath =
        typeof mod.basePath === "string" && mod.basePath.startsWith("/")
          ? mod.basePath
          : null;
      const router = mod.router;

      if (!basePath || !router) {
        console.log(`ℹ️  Router ${file} hat keinen gültigen Export – übersprungen.`);
        continue;
      }

      // ✅ Nur EIN Mount-Punkt
      app.use(`/api${basePath}`, router);
      console.log(
        `➡️  Mounted ${basePath.replace("/", "")} from ${path.relative(
          process.cwd(),
          full
        )} at /api${basePath}`
      );
    } catch (e) {
      console.error(
        `❌ Router-Load-Fehler für ${path.relative(process.cwd(), full)}:\n`,
        e
      );
    }
  }
}
mountRouters();

// Health
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV || "development" })
);

// ───────────────── Frontend (Vite dev/prod) + Discord-Bot Init
function initDiscordBot() {
  try {
    const discordBot = require("./discord-bot");
    if (discordBot && typeof discordBot.init === "function") {
      discordBot.init();
    } else {
      console.warn("[discord-bot] init nicht gefunden – übersprungen.");
    }
  } catch (e) {
    console.warn("[discord-bot] init skipped:", e?.message || e);
  }
}

if (!isProd) {
  // DEV: Vite-Express (optional)
  let viteExpress;
  try {
    viteExpress = require("vite-express");
  } catch {
    viteExpress = null;
  }

  if (viteExpress) {
    const frontendRoot = path.join(__dirname, "..", "frontend");
    console.log(`[info] Frontend root: ${frontendRoot}`);
      viteExpress.listen(app, PORT, () => {
      console.log(`✅ DEV-Server läuft auf http://localhost:${PORT}`);
      if (process.env.START_DISCORD !== "false") {
        initDiscordBot();
      }
    });
  } else {
    app.listen(PORT, () => {
      console.log(`✅ (ohne Vite) Server läuft auf http://localhost:${PORT}`);
      if (process.env.START_DISCORD !== "false") {
        initDiscordBot();
      }
    });
  }
} else {
  // PROD: statisches Build ausliefern (falls vorhanden)
  const distDir = path.join(__dirname, "..", "..", "dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }
  app.listen(PORT, () => {
    console.log(`✅ PROD-Server läuft auf http://localhost:${PORT}`);
    if (process.env.START_DISCORD !== "false") {
      initDiscordBot();
    }
  });
}
