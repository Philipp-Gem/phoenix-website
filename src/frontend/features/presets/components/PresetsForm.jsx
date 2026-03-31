// src/frontend/features/presets/components/PresetsForm.jsx
import React, { useEffect, useImperativeHandle, useState, forwardRef } from "react";

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/**
 * Props:
 *  - mode: 'create' | 'edit'
 *  - initial: { id, name, tanks, healers, dps, lootbuddies } | undefined
 *  - onSubmit(payload)
 *  - onCancel?()
 *
 * Exposed via ref:
 *  - submit(): void   -> triggert das Absenden mit aktuellen Form-Werten
 */
const PresetsForm = forwardRef(function PresetsForm(
  { mode = "create", initial, onSubmit, onCancel },
  ref
) {
  const [name, setName] = useState("");
  const [tanks, setTanks] = useState(0);
  const [healers, setHealers] = useState(0);
  const [dps, setDps] = useState(0);
  const [lootbuddies, setLootbuddies] = useState(0);

  // bei Wechsel des zu bearbeitenden Presets die Felder füllen/leeren
  useEffect(() => {
    if (initial) {
      setName(initial.name || "");
      setTanks(initial.tanks ?? 0);
      setHealers(initial.healers ?? 0);
      setDps(initial.dps ?? 0);
      setLootbuddies(initial.lootbuddies ?? 0);
    } else {
      setName("");
      setTanks(0);
      setHealers(0);
      setDps(0);
      setLootbuddies(0);
    }
  }, [initial?.id]);

  function buildPayload() {
    return {
      name: String(name || "").trim(),
      tanks: toInt(tanks),
      healers: toInt(healers),
      dps: toInt(dps),
      lootbuddies: toInt(lootbuddies),
    };
  }

  function handleSubmit(e) {
    e?.preventDefault?.();
    onSubmit?.(buildPayload());
  }

  // 👉 Form programmatisch aus der Tabelle absendbar machen
  useImperativeHandle(ref, () => ({
    submit: () => handleSubmit(),
  }));

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs text-zinc-400">Name</label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Manaforge HC 8/8"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">Tanks</label>
        <input
          type="number" min={0}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={tanks}
          onChange={(e) => setTanks(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">Healer</label>
        <input
          type="number" min={0}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={healers}
          onChange={(e) => setHealers(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">DPS</label>
        <input
          type="number" min={0}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={dps}
          onChange={(e) => setDps(e.target.value)}
        />
      </div>

      <div className="sm:col-span-5">
        <label className="mb-1 block text-xs text-zinc-400">Lootbuddys</label>
        <input
          type="number" min={0}
          className="w-full max-w-[240px] rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={lootbuddies}
          onChange={(e) => setLootbuddies(e.target.value)}
        />
      </div>

      <div className="sm:col-span-5 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          {mode === "edit" ? "Änderungen speichern" : "Preset anlegen"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
});

export default PresetsForm;
