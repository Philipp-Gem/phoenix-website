// src/frontend/features/raids/components/RaidListTable.jsx
import React from "react";

/**
 * Erwartet bereits vorformatierte Rows:
 * { id, title, dateLabel, timeLabel, difficultyLabel, lootLabel, bossesLabel, leadLabel, detailUrl }
 */
export default function RaidListTable({ rows = [], onDelete }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <div className="px-3 py-10 text-center text-zinc-400">
        Keine Raids gefunden.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-800">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-zinc-400">
            <th className="px-4 py-3">Titel</th>
            <th className="px-4 py-3">Datum</th>
            <th className="px-4 py-3">Uhrzeit</th>
            <th className="px-4 py-3">Diff</th>
            <th className="px-4 py-3">Loot</th>
            <th className="px-4 py-3">Bosses</th>
            <th className="px-4 py-3">Lead</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 text-sm text-zinc-200">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium">{r.title}</td>
              <td className="px-4 py-3">{r.dateLabel}</td>
              <td className="px-4 py-3">{r.timeLabel}</td>
              <td className="px-4 py-3">{r.difficultyLabel}</td>
              <td className="px-4 py-3">{r.lootLabel}</td>
              <td className="px-4 py-3">{r.bossesLabel}</td>
              <td className="px-4 py-3">{r.leadLabel}</td>
              <td className="px-4 py-3 text-right">
                <a
                  href={r.detailUrl || `/raids/${r.id}`}
                  className="mr-2 rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  title="Details ansehen"
                >
                  Details
                </a>
                {typeof onDelete === "function" && (
                  <button
                    className="rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    onClick={() => onDelete(r.id)}
                  >
                    Löschen
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
