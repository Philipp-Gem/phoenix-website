// src/frontend/features/raids/components/RaidCreateForm.jsx
import React from "react";
import useRaidCreateForm from "../hooks/useRaidCreateForm";

export default function RaidCreateForm({ me, leads = [], canPickLead = false, onCreate }) {
  const form = useRaidCreateForm({ me, canPickLead, onCreate });

  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => { e.preventDefault(); form.submit(); }}
    >
      {/* Fehleranzeige */}
      {!!form.error && (
        <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-rose-700 bg-rose-900/40 px-3 py-2 text-rose-200">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm">{form.error}</div>
            <button
              type="button"
              onClick={form.clearError}
              className="rounded bg-rose-700/40 px-2 py-1 text-xs hover:bg-rose-700/60"
              title="Fehlermeldung schließen"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Automatisch generierter Titel (read-only Preview) */}
      <div className="lg:col-span-3">
        <label className="mb-1 block text-xs text-zinc-400">Titel (automatisch)</label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200"
          value={form.autoTitle}
          readOnly
          title="Titel wird aus Name, Difficulty, Loot und ggf. Bossfortschritt (Mythic) generiert."
        />
      </div>

      {/* Datum */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Datum &amp; Zeit</label>
        <input
          type="datetime-local"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={form.date}
          onChange={(e) => form.setDate(e.target.value)}
          required
        />
      </div>

      {/* Difficulty */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Difficulty</label>
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={form.difficulty}
          onChange={(e) => form.setDifficulty(e.target.value)}
        >
          <option value="HC">Heroic</option>
          <option value="Mythic">Mythic</option>
          <option value="Normal">Normal</option>
        </select>
      </div>

      {/* Loot */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Loot</label>
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={form.lootType}
          onChange={(e) => form.setLootType(e.target.value)}
          disabled={form.isMythic}
        >
          {form.lootOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Preset (optional) */}
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="mb-1 block text-xs text-zinc-400">Preset (optional)</label>
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={form.presetId}
          onChange={(e) => form.setPresetId(e.target.value)}
        >
          <option value="">– kein Preset –</option>
          {form.presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name ?? `Preset #${p.id}`}
              {typeof p.tanks === "number" || typeof p.heals === "number" || typeof p.dps === "number" || typeof p.loot === "number"
                ? `  (T${p.tanks ?? 0}/H${p.heals ?? 0}/D${p.dps ?? 0}/L${p.loot ?? 0})`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Mythic: Bosse */}
      {form.isMythic && (
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Bosse (1–8)</label>
          <input
            type="number"
            min={1}
            max={8}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={form.bosses}
            onChange={(e) => form.setBosses(e.target.value)}
          />
        </div>
      )}

      {/* Lead (nur wenn Admin/Owner) – OHNE „mich selbst“-Option */}
      {canPickLead && (
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Raidlead (optional)</label>
          <select
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            value={form.lead || ""}
            onChange={(e) => form.setLead(e.target.value)}
          >
            <option value="">– Lead wählen –</option>
            {leads?.map((u) => (
              <option key={u.discordId || u.id} value={u.discordId || u.id}>
                {u.displayName || u.username || u.name || u.discordTag || u.discordId || u.id}
              </option>
            ))}
          </select>
          <small className="text-xs text-zinc-400">
            Keine Auswahl ⇒ Backend setzt automatisch dich als Lead.
          </small>
        </div>
      )}

      {/* Submit */}
      <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
        <button
          type="submit"
          disabled={form.submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500 disabled:opacity-60"
        >
          {form.submitting ? "Erstelle…" : "Raid erstellen"}
        </button>
      </div>
    </form>
  );
}
