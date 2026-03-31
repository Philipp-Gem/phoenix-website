// src/frontend/features/users/pages/UsersList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import { apiListUsers } from "../../../app/api/usersAPI.js";

// Strike-UI (nur im Detailbereich sichtbar)
import StrikeForm from "../components/StrikeForm.jsx";
import StrikeList from "../components/StrikeList.jsx";
import { useStrikes } from "../hooks/useStrikes.js";

function Badge({ children, tone = "zinc" }) {
  const tones = {
    zinc: "bg-zinc-700/60 text-zinc-200 ring-zinc-700/60",
    green: "bg-emerald-600/20 text-emerald-300 ring-emerald-600/40",
    amber: "bg-amber-600/20 text-amber-300 ring-amber-600/40",
    blue: "bg-sky-600/20 text-sky-300 ring-sky-600/40",
    violet: "bg-violet-600/20 text-violet-300 ring-violet-600/40",
    red: "bg-red-600/20 text-red-300 ring-red-600/40",
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone] || tones.zinc}`}>
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</div>
      {children}
    </div>
  );
}

/** Details pro User – lädt Strikes on-demand */
function UserDetails({ user }) {
  const uid = user?.discordId;
  const { items: strikes, loading: strikesLoading, error: strikesErr, add, remove } =
    useStrikes(uid, { activeOnly: true });

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {/* Chars */}
      <div className="lg:col-span-1">
        <Section title="Chars">
          {user.chars?.length ? (
            <ul className="space-y-1">
              {user.chars.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">
                      {c.name}-{c.realm}{" "}
                      <span className="text-xs text-zinc-400">({c.class || "?"} / {c.spec || "?"})</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      iLvl {c.itemLevel ?? "—"} · RIO {Math.round(c.rioScore ?? 0)}
                    </div>
                  </div>
                  {c.wclUrl ? (
                    <a
                      href={c.wclUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-300 hover:underline"
                    >
                      WarcraftLogs
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-500">—</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-zinc-400">Keine Chars.</div>
          )}
        </Section>
      </div>

      {/* Historie */}
      <div className="lg:col-span-1">
        <Section title="Raid-Historie (letzte 20)">
          {user.history?.length ? (
            <ul className="space-y-1">
              {user.history.map((h) => (
                <li
                  key={`${h.id}-${h.raidId}`}
                  className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{h.raidTitle || `Raid #${h.raidId}`}</div>
                    <div className="text-xs text-zinc-400">
                      {h.date ? new Date(h.date).toLocaleString() : "—"} · {h.type} ·{" "}
                      {h.char?.name ? `${h.char.name}-${h.char.realm}` : "—"}
                    </div>
                  </div>
                  <Badge tone={h.status === "PICKED" ? "green" : "zinc"}>{h.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-zinc-400">Keine Einträge.</div>
          )}
        </Section>
      </div>

      {/* Strikes */}
      <div className="lg:col-span-1">
        <Section title="Strikes (aktiv)">
          <div className="space-y-3">
            <StrikeForm
              onSubmit={async ({ reason, weight, expiresAt }) => {
                await add({ reason, weight, expiresAt });
              }}
            />
            {strikesErr && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {String(strikesErr?.message || "Fehler beim Laden")}
              </div>
            )}
            <StrikeList items={strikes} onRemove={async (id) => remove(id)} />
            {strikesLoading && <div className="text-sm text-zinc-400">Lade Strikes…</div>}
          </div>
        </Section>
      </div>
    </div>
  );
}

export default function UsersList() {
  const { user } = useAuth();
  const canManage = !!(user?.isOwner || user?.isAdmin);

  const [q, setQ] = useState("");
  const [needle, setNeedle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  // debounce Suche
  useEffect(() => {
    const t = setTimeout(() => setNeedle(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = async () => {
    if (!canManage) return;
    setBusy(true);
    setErr("");
    try {
      const list = await apiListUsers(needle);
      setRows(
        (list || []).map((u) => ({
          // 🔧 FIX: korrektes Spread!
          ...u,
          $open: false,
          $charsCount: (u.chars || []).length,
          $histCount: (u.history || []).length,
          strikeCount: u.strikeCount ?? 0,
        }))
      );
    } catch (e) {
      setErr(e?.message || "Fehler beim Laden");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needle, canManage]);

  const visible = useMemo(() => rows, [rows]);

  if (!canManage) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-xl font-semibold text-white">Benutzerverwaltung</h1>
        <p className="text-sm text-zinc-300">
          Nur für <code>owner</code> oder <code>admin</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Benutzerverwaltung</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche (Name, Username, Discord-ID)…"
            className="w-64 rounded-md bg-zinc-800/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 ring-1 ring-inset ring-zinc-700/60 focus:outline-none focus:ring-zinc-500"
          />
          <button
            onClick={load}
            disabled={busy}
            className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700/60 hover:bg-zinc-700 disabled:opacity-60"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Tabelle */}
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <div className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_0.6fr] bg-zinc-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          <div>User</div>
          <div>Discord-ID</div>
          <div>Rollen</div>
          <div>Counts</div>
          <div className="text-right">Aktion</div>
        </div>

        <div className="divide-y divide-zinc-800">
          {visible.map((u, idx) => {
            const name = u.displayName || u.username || u.discordId;
            return (
              <div key={u.discordId || idx} className="bg-zinc-900/30">
                <div className="grid grid-cols-[1.2fr_1fr_1.2fr_1fr_0.6fr] items-center px-3 py-3">
                  {/* User */}
                  <div className="flex items-center gap-3 min-w-0">
                    {u.avatarUrl ? (
                      <img
                        className="h-8 w-8 rounded-full ring-1 ring-zinc-700 object-cover"
                        src={u.avatarUrl}
                        alt={name}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-zinc-800 grid place-items-center text-xs text-zinc-200">
                        {name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white">{u.displayName || u.username || u.discordId}</div>
                      <div className="truncate text-xs text-zinc-400">{u.username || "—"}</div>
                    </div>
                  </div>

                  {/* Discord-ID */}
                  <div className="text-sm text-zinc-300">{u.discordId}</div>

                  {/* Rollen */}
                  <div className="flex flex-wrap items-center gap-2">
                    {u.isOwner && <Badge tone="amber">Owner</Badge>}
                    {u.isAdmin && <Badge tone="red">Admin</Badge>}
                    {u.isRaidlead && <Badge tone="blue">Raidlead</Badge>}
                    {!u.isOwner && !u.isAdmin && !u.isRaidlead && <span className="text-sm text-zinc-400">–</span>}
                  </div>

                  {/* Counts */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">Chars:</span>
                      <Badge tone="violet">{u.$charsCount}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">Historie:</span>
                      <Badge tone="green">{u.$histCount}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">Strikes:</span>
                      <Badge tone="red">{u.strikeCount ?? 0}</Badge>
                    </div>
                  </div>

                  {/* Aktion */}
                  <div className="text-right">
                    <button
                      onClick={() =>
                        setRows((r) =>
                          r.map((row, i) => (i === idx ? { ...row, $open: !row.$open } : row))
                        )
                      }
                      className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-700/60 hover:bg-zinc-700"
                    >
                      Details
                    </button>
                  </div>
                </div>

                {/* Details */}
                {u.$open && (
                  <div className="border-t border-zinc-800 px-3 py-3">
                    <UserDetails user={u} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
          {visible.length} Nutzer
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}
    </div>
  );
}
