import React from "react";

/**
 * Schlanke Liste aktiver Strikes.
 * Props:
 *  - items: Array<{ id, reason, weight, createdAt, expiresAt }>
 *  - onRemove: (id) => Promise<void>
 */

// Lokales Datumsformat: "27.01.2026 · 16:00"
function formatDateTime(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${day}.${month}.${year} · ${hour}:${min}`;
}

export default function StrikeList({ items = [], onRemove }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-3 text-sm text-zinc-300">
        Keine aktiven Strikes.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Aktive Strikes
      </div>

      <ul className="divide-y divide-zinc-800">
        {items.map((s, idx) => {
          const createdStr = formatDateTime(s.createdAt);
          const expiresStr = s.expiresAt ? formatDateTime(s.expiresAt) : null;

          return (
            <li key={s.id ?? idx} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="flex min-w-0 items-start gap-2">
                {/* Gewicht */}
                <span
                  className="mt-0.5 inline-flex h-6 shrink-0 items-center justify-center rounded-md px-2 text-xs font-semibold ring-1 ring-inset bg-red-600/20 text-red-300 ring-red-600/40"
                  title="Gewicht"
                >
                  w={s.weight ?? "?"}
                </span>

                {/* Inhalt */}
                <div className="min-w-0">
                  <div className="truncate text-sm text-white">{s.reason || "—"}</div>

                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    {createdStr && (
                      <span className="whitespace-nowrap" title={String(s.createdAt)}>
                        erteilt: {createdStr}
                      </span>
                    )}

                    {expiresStr && (
                      <span
                        className="inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-amber-300 ring-1 ring-inset ring-amber-600/40 bg-amber-600/10"
                        title={String(s.expiresAt)}
                      >
                        läuft ab: {expiresStr}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Aktion */}
              <div className="shrink-0">
                <button
                  onClick={() => onRemove?.(s.id)}
                  className="rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 ring-1 ring-inset ring-zinc-700/60 hover:bg-zinc-700"
                >
                  Entfernen
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
