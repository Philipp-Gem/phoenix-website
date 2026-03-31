// src/frontend/features/chars/pages/CharsList.jsx
import React from "react";
import useMyChars from "../hooks/useMyChars";
import CharImportForm from "../components/CharImportForm";

export default function CharsList() {
  const {
    chars, loading, error,
    preview, importChar, removeChar,
    refreshCharNow, refreshAllStale,
  } = useMyChars();

  const errText = error?.message || error;
  const is401 = Number(error?.status) === 401;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Meine Chars</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshAllStale(20)}
            className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 hover:bg-sky-500/20"
            title="Admin-Endpoint: aktualisiert veraltete Chars (Limit 20)"
          >
            Alle veralteten aktualisieren
          </button>
        </div>
      </div>

      {is401 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          Bitte zuerst einloggen (Discord OAuth), um deine Chars zu verwalten.
        </div>
      ) : (
        <>
          <div className="mb-6">
            <CharImportForm onPreview={preview} onImport={importChar} loading={loading} />
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70">
            <div className="border-b border-zinc-800/60 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Gespeicherte Chars
              </h2>
            </div>

            <div className="px-3 py-3">
              {loading ? (
                <div className="px-3 py-10 text-center text-zinc-400">Lädt …</div>
              ) : errText ? (
                <div className="px-3 py-6 text-sm text-red-400">Fehler: {String(errText)}</div>
              ) : !Array.isArray(chars) || chars.length === 0 ? (
                <div className="px-3 py-10 text-center text-zinc-400">Noch keine Chars angelegt.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-800 text-sm">
                    <thead className="text-zinc-400">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Realm</th>
                        <th className="px-4 py-2 text-left">Klasse</th>
                        <th className="px-4 py-2 text-left">Spec</th>
                        <th className="px-4 py-2 text-left">ILvl</th>
                        <th className="px-4 py-2 text-left">RIO</th>
                        <th className="px-4 py-2 text-left">Progress</th>
                        <th className="px-4 py-2 text-left">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-zinc-200">
                      {chars.map((c) => (
                        <tr key={`${c.userId}:${c.name}:${c.realm}`}>
                          <td className="px-4 py-2 font-medium">{c.name}</td>
                          <td className="px-4 py-2">{c.realm}</td>
                          <td className="px-4 py-2">{c.class || "–"}</td>
                          <td className="px-4 py-2">{c.spec || "–"}</td>
                          <td className="px-4 py-2">{c.itemLevel ?? "–"}</td>
                          <td className="px-4 py-2">{c.rioScore ?? "–"}</td>
                          <td className="px-4 py-2">{c.progress || "–"}</td>
                          <td className="px-4 py-2 space-x-2">
                            <button
                              onClick={() => refreshCharNow(c.id)}
                              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
                              title="Jetzt von Raider.IO aktualisieren"
                            >
                              Aktualisieren
                            </button>
                            <button
                              onClick={() => removeChar(c.id)}
                              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                            >
                              Löschen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
