// src/frontend/features/chars/components/CharImportForm.jsx
import React, { useState } from "react";

export default function CharImportForm({ onPreview, onImport, loading = false }) {
  const [name, setName] = useState("");
  const [realm, setRealm] = useState("");
  const [region, setRegion] = useState("eu");

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  async function handlePreview(e) {
    e.preventDefault();
    setError(null);
    setPreview(null);
    try {
      const p = await onPreview?.({ name, realm, region });
      setPreview(p || null);
    } catch (e2) {
      setError(e2?.message || "Vorschau fehlgeschlagen");
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    setError(null);
    try {
      await onImport?.({ name, realm, region });
      // nach erfolgreichem Import Felder leeren
      setPreview(null);
      setName("");
      setRealm("");
    } catch (e2) {
      setError(e2?.message || "Import fehlgeschlagen");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-4">
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-5" onSubmit={handlePreview}>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">Char-Name</label>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Syntaxx"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">Realm</label>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={realm}
            onChange={(e) => setRealm(e.target.value)}
            placeholder="z. B. Blackrock"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Region</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="eu">EU</option>
            <option value="us">US</option>
            <option value="kr">KR</option>
            <option value="tw">TW</option>
          </select>
        </div>

        <div className="sm:col-span-5 flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            Vorschau
          </button>
          <button
            onClick={handleImport}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            Importieren
          </button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {preview && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200">
          <div><b>{preview.name}</b> – {preview.realm} ({region.toUpperCase()})</div>
          <div>Klasse/Spec: {preview.class || "–"} / {preview.spec || "–"}</div>
          <div>Itemlevel: {preview.itemLevel ?? "–"}</div>
          <div>RIO: {preview.rioScore ?? "–"}</div>
          <div>Progress: {preview.progress || "–"}</div>
        </div>
      )}
    </div>
  );
}
