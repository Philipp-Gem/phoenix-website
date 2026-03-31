// src/frontend/features/my-raids/pages/MyRaids.jsx
import React from "react";
import useMyRaids from "../hooks/useMyRaids.js";
import MyRaidCard from "../components/MyRaidCard.jsx";

function Section({ title, count, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <div className="text-xs text-zinc-400">{count} Einträge</div>
      </div>
      {children}
    </div>
  );
}

export default function MyRaidsPage() {
  const { loading, error, upcoming, past } = useMyRaids();

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Lade …
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300 whitespace-pre-wrap">
        Fehler beim Laden von My Raids: {String(error?.message || error)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Section title="Geplant (Roster)" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-400">
            Keine kommenden Roster-Einsätze.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((it) => (
              <MyRaidCard key={`${it.raidId}-${it.date}`} item={it} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Vergangene Roster" count={past.length}>
        {past.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-400">
            Noch keine vergangenen Roster-Einsätze.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {past.map((it) => (
              <MyRaidCard key={`${it.raidId}-${it.date}`} item={it} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
