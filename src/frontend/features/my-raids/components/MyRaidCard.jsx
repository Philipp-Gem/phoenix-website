// src/frontend/features/my-raids/components/MyRaidCard.jsx
import React from "react";
import { Link } from "react-router-dom";

function Badge({ variant = "neutral", children }) {
  const classes = {
    neutral: "border-zinc-700/50 bg-zinc-800/50 text-zinc-200",
    picked: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  }[variant] || "border-zinc-700/50 bg-zinc-800/50 text-zinc-200";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${classes}`}>
      {children}
    </span>
  );
}

export default function MyRaidCard({ item }) {
  const statusBadge = <Badge variant="picked">Roster</Badge>;

  const charLine = [
    item.charName ? item.charName + (item.charRealm ? `-${item.charRealm}` : "") : null,
    item.charClass || null,
    item.itemLevel ? `${item.itemLevel} ilvl` : null,
    item.role || null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">{item.title || "-"}</div>
          <div className="text-xs text-zinc-400">{item.dateLabel}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusBadge}
          <Link
            to={`/raids/${item.raidId}`}
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
          >
            Öffnen
          </Link>
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Difficulty</div>
          <div className="text-sm text-zinc-200">{item.difficultyLabel}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Loot</div>
          <div className="text-sm text-zinc-200">{item.lootLabel}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Bosses</div>
          <div className="text-sm text-zinc-200">{item.bosses ?? "-"}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Lead</div>
          <div className="text-sm text-zinc-200">{item.leadDisplay || "-"}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">Char</div>
        <div className="text-sm text-zinc-200">{charLine || "-"}</div>
      </div>
    </div>
  );
}
