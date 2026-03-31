// scripts/init-frontend-structure.js
// Erstellt die Frontend-Struktur (React + Vite) und legt sichere Platzhalter an.
// Bestehende Dateien werden NICHT überschrieben.

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const root = process.cwd();
const to = (...p) => path.join(root, ...p);

const dirs = [
  "src/frontend",
  "src/frontend/app",
  "src/frontend/app/layout",
  "src/frontend/app/providers",
  "src/frontend/app/api",
  "src/frontend/features/raids/pages",
  "src/frontend/features/raids/components",
  "src/frontend/features/presets/pages",
  "src/frontend/features/my-raids/pages",
  "src/frontend/shared/components",
  "src/frontend/shared/hooks",
  "src/frontend/shared/lib",
  "src/frontend/styles",
  "src/frontend/public",
];

const files = [
  // Basis-Dateien (werden nur erstellt, wenn nicht vorhanden)
  {
    p: "src/frontend/index.html",
    content: `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="dark light" />
    <title>Boosting Bot</title>
    <link rel="stylesheet" href="/styles/app.css" />
  </head>
  <body>
    <div id="root">
      <noscript>
        <div class="boot">
          <div class="card">
            <h1>Boosting Bot</h1>
            <p class="hint">Bitte JavaScript aktivieren.</p>
          </div>
        </div>
      </noscript>
    </div>
    <script type="module" src="/main.jsx"></script>
  </body>
</html>
`,
  },
  {
    p: "src/frontend/main.jsx",
    content: `import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx"; // Falls du später AppShell nutzt, diesen Import anpassen

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
`,
  },
  {
    p: "src/frontend/App.jsx",
    content: `import React from "react";
import MainLayout from "./app/layout/MainLayout.jsx";

export default function App() {
  return <MainLayout />;
}
`,
  },

  // App-Shell / Layout / Provider / API
  {
    p: "src/frontend/app/layout/MainLayout.jsx",
    content: `import React from "react";
import { Link } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="container">
      <header className="card">
        <h1 style={{ margin: 0 }}>Boosting Bot</h1>
        <nav style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" to="/">Start</Link>
          <Link className="btn" to="/raids">Raids</Link>
          <Link className="btn" to="/presets">Presets</Link>
          <Link className="btn" to="/my-raids">Meine Raids</Link>
        </nav>
      </header>

      <main className="grid" style={{ marginTop: 16 }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Willkommen 👋</h2>
          <p className="hint">Dieser Layout-Platzhalter wird später durch echte Routen/Seiten ersetzt.</p>
        </section>
      </main>
    </div>
  );
}
`,
  },
  {
    p: "src/frontend/app/api/client.js",
    content: `// fetch-Wrapper (immer mit Credentials), Fehler werden als Error geworfen
export async function apiGet(path) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(\`\${res.status} \${res.statusText}\`);
  return res.json();
}
export async function apiJson(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(\`\${res.status} \${res.statusText}\`);
  return res.json();
}
export const apiPost = (p, b) => apiJson("POST", p, b);
export const apiPatch = (p, b) => apiJson("PATCH", p, b);
export const apiDelete = (p) => apiJson("DELETE", p);
`,
  },
  {
    p: "src/frontend/app/providers/AuthProvider.jsx",
    content: `import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet } from "../api/client.js";

const AuthCtx = createContext({ user: null, loading: true });
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await apiGet("/api/auth/me");
        if (alive) setState({ user: j?.user ?? null, loading: false });
      } catch {
        if (alive) setState({ user: null, loading: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}
`,
  },

  // Feature-Platzhalter
  {
    p: "src/frontend/features/raids/pages/RaidsList.jsx",
    content: `import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../../app/api/client.js";

export default function RaidsList() {
  const [data, setData] = useState({ ok: true, raids: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await apiGet("/api/raids");
        if (alive) setData(j);
      } catch (e) {
        if (alive) setErr(String(e.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Raids</h2>
      {loading && <p className="hint">Lade…</p>}
      {err && <p className="hint">Fehler: {err}</p>}
      {!loading && !err && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {data.raids?.length ? data.raids.map((r) => (
            <article className="card" key={r.id}>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>{r.title}</h3>
              <p className="hint" style={{ margin: 0 }}>{r.difficulty} • {r.lootType}</p>
              <div style={{ marginTop: 12 }}><Link className="btn" to={"/raids/" + r.id}>Details</Link></div>
            </article>
          )) : <p className="hint">Keine Raids.</p>}
        </div>
      )}
    </div>
  );
}
`,
  },
  {
    p: "src/frontend/features/raids/pages/RaidDetail.jsx",
    content: `import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "../../../app/api/client.js";

export default function RaidDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ ok: true, raid: null });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await apiGet("/api/raids/" + id);
        if (alive) setData(j);
      } catch (e) {
        if (alive) setErr(String(e.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Raid Detail</h2>
      {loading && <p className="hint">Lade…</p>}
      {err && <p className="hint">Fehler: {err}</p>}
      {!loading && !err && !data.raid && <p className="hint">Nicht gefunden.</p>}
      {!loading && !err && data.raid && (
        <>
          <h3 style={{ marginTop: 0 }}>{data.raid.title}</h3>
          <p className="hint">{data.raid.difficulty} • {data.raid.lootType}</p>
        </>
      )}
    </div>
  );
}
`,
  },
  {
    p: "src/frontend/features/presets/pages/Presets.jsx",
    content: `import React, { useEffect, useState } from "react";
import { apiGet } from "../../../app/api/client.js";

export default function PresetsPage() {
  const [data, setData] = useState({ ok: true, presets: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await apiGet("/api/presets");
        if (alive) setData(j);
      } catch (e) {
        if (alive) setErr(String(e.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Presets</h2>
      {loading && <p className="hint">Lade…</p>}
      {err && <p className="hint">Fehler: {err}</p>}
      {!loading && !err && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {data.presets?.length ? data.presets.map((p) => (
            <article className="card" key={p.id}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{p.name}</h3>
              <p className="hint" style={{ margin: 0 }}>
                Tanks {p.tanks} • Heals {p.healers} • DPS {p.dps} • Lootbuddies {p.lootbuddies}
              </p>
            </article>
          )) : <p className="hint">Keine Presets.</p>}
        </div>
      )}
    </div>
  );
}
`,
  },
  {
    p: "src/frontend/features/my-raids/pages/MyRaids.jsx",
    content: `import React from "react";
export default function MyRaidsPage() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Meine Raids</h2>
      <p className="hint">Platzhalter – hier erscheinen künftig deine geplanten & angemeldeten Raids.</p>
    </div>
  );
}
`,
  },

  // Shared Components + Styles
  {
    p: "src/frontend/shared/components/Button.jsx",
    content: `import React from "react";
export default function Button({ as: As = "button", className = "", ...rest }) {
  return <As className={("btn " + className).trim()} {...rest} />;
}
`,
  },
  {
    p: "src/frontend/shared/components/Panel.jsx",
    content: `import React from "react";
export default function Panel({ className = "", ...rest }) {
  return <div className={("card " + className).trim()} {...rest} />;
}
`,
  },
  {
    p: "src/frontend/styles/app.css",
    content: `:root {
  --bg: #0b0d10;
  --panel: #111418;
  --text: #e7edf3;
  --muted: #9aa7b2;
  --accent: #5aa3ff;
  --border: #1a1f25;
  --shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
}

html, body, #root { height: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.container { max-width: 1200px; margin: 0 auto; padding: 24px; }
.boot { max-width: 960px; margin: 0 auto; padding: 24px; }
.hint { color: var(--muted); font-size: 0.9rem; }

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: var(--shadow);
}

.grid { display: grid; gap: 16px; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #141a20;
  color: var(--text);
  cursor: pointer;
}
.btn:hover { background: #161d24; }
.btn:active { transform: translateY(1px); }

.input, .select {
  height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #0f1317;
  color: var(--text);
}
`,
  },
];

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
  // .gitkeep, um leere Ordner zu versionieren
  const keep = path.join(p, ".gitkeep");
  try { await fsp.access(keep, fs.constants.F_OK); } catch { await fsp.writeFile(keep, ""); }
}

async function ensureFile(filePath, content) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    console.log("skip ", filePath);
  } catch {
    await ensureDir(path.dirname(filePath));
    await fsp.writeFile(filePath, content, "utf8");
    console.log("create", filePath);
  }
}

(async () => {
  try {
    for (const d of dirs) await ensureDir(to(d));
    for (const f of files) await ensureFile(to(f.p), f.content);
    console.log("\n✅ Frontend-Struktur ist bereit. Bestehende Dateien wurden nicht überschrieben.");
  } catch (err) {
    console.error("❌ Fehler beim Erstellen der Struktur:", err);
    process.exit(1);
  }
})();
