// src/frontend/features/raids/components/RaidEditForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiUpdateRaid } from "../../../app/api/raidsAPI.js";
import { apiListPresets } from "../../../app/api/presetsAPI.js";
import { apiGetLeads } from "../../../app/api/usersAPI.js";

// Hilfsfunktionen
const U = (x) => String(x || "").toUpperCase();
const L = (x) => String(x || "").toLowerCase();

function toLocalInputValue(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (!isFinite(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// ⚠️ FIX: Input "YYYY-MM-DDTHH:mm" als *lokale* Zeit parsen und direkt zu UTC konvertieren
function parseLocalDateTime(input) {
  if (!input) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  // new Date(Y, M, D, H, M) => interpretiert als *lokale* Zeit (berücksichtigt DST!)
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}
function toUtcIso(input) {
  const local = parseLocalDateTime(input);
  return local ? local.toISOString() : null;
}

// Dropdown-Optionen
const DIFF_OPTIONS = [
  { value: "HC", label: "Heroic" },
  { value: "MYTHIC", label: "Mythic" },
  { value: "NORMAL", label: "Normal" },
];

const LOOT_ALL = [
  { value: "vip", label: "VIP" },
  { value: "unsaved", label: "Unsaved" },
  { value: "saved", label: "Saved" },
];

// Normalizer (macht die Form robust gegen unterschiedliche API-Shapes)
function normalizePresets(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.presets)) return raw.presets;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}
function normalizeLeads(raw) {
  const arr = Array.isArray(raw) ? raw
    : Array.isArray(raw?.leads) ? raw.leads
    : Array.isArray(raw?.users) ? raw.users
    : Array.isArray(raw?.data) ? raw.data
    : [];
  return arr.map((u) => ({
    id: u.discordId || u.id || u.userId || "",
    label: u.displayName || u.username || u.name || u.discordId || "",
  })).filter(x => x.id);
}

export default function RaidEditForm({ raid, onSaved, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ⚙️ Vorbelegung aus bestehendem Raid
  const [dateLocal, setDateLocal] = useState(toLocalInputValue(raid?.date));
  const [difficulty, setDifficulty] = useState(raid?.difficulty || "HC");
  const [lootType, setLootType] = useState(raid?.lootType || "vip");
  const [bosses, setBosses] = useState(raid?.bosses ?? 0);
  const [lead, setLead] = useState(raid?.lead ?? "");          // Discord-ID
  const [presetId, setPresetId] = useState(raid?.presetId ?? ""); // Zahl oder ""

  // Referenzdaten
  const [presets, setPresets] = useState([]);
  const [leads, setLeads] = useState([]);

  const isMythic = useMemo(() => U(difficulty) === "MYTHIC", [difficulty]);
  const lootOptions = useMemo(() => LOOT_ALL, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pRes, lRes] = await Promise.all([
          apiListPresets().catch(() => []),
          apiGetLeads().catch(() => []),
        ]);
        if (!alive) return;
        setPresets(normalizePresets(pRes));
        setLeads(normalizeLeads(lRes));
      } catch {
        /* ignore */
      }
    })();
    return () => { alive = false; };
  }, []);

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      // ❗ Bestehende Werte als Fallback verwenden, wenn nichts geändert wurde
      const nextPresetId =
        presetId === "" || presetId === undefined || presetId === null
          ? (raid?.presetId ?? null)
          : Number(presetId);

      const nextLead =
        lead === "" || lead === undefined || lead === null
          ? (raid?.lead || null)
          : String(lead);

      const patch = {
        date: toUtcIso(dateLocal) || raid?.date || null,
        difficulty: U(difficulty || raid?.difficulty || "HC"),
        lootType: L(lootType || raid?.lootType || "vip"),
        bosses: Number.isFinite(Number(bosses)) ? Number(bosses) : (raid?.bosses ?? 0),
        lead: nextLead,              // Discord-ID
        presetId: nextPresetId,      // Zahl oder null
      };

      const updated = await apiUpdateRaid(raid.id, patch);
      if (!updated || !updated.id) throw new Error("Update fehlgeschlagen.");
      onSaved && onSaved(updated);
    } catch (e) {
      setErr(String(e?.message || e) || "Unbekannter Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) submit();
      }}
    >
      {!!err && (
        <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-rose-700 bg-rose-900/40 px-3 py-2 text-rose-200">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm">{err}</div>
            <button
              type="button"
              onClick={() => setErr("")}
              className="rounded bg-rose-700/40 px-2 py-1 text-xs hover:bg-rose-700/60"
              title="Fehlermeldung schließen"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Titel (read-only) */}
      <div className="lg:col-span-3">
        <label className="mb-1 block text-xs text-zinc-400">Titel</label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200"
          value={raid?.title || ""}
          readOnly
          title="Titel wird serverseitig automatisch generiert."
        />
      </div>

      {/* Datum/Zeit */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Datum &amp; Zeit</label>
        <input
          type="datetime-local"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={dateLocal}
          onChange={(e) => setDateLocal(e.target.value)}
          required
        />
      </div>

      {/* Difficulty */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Difficulty</label>
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          {DIFF_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Loot */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Loot</label>
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={lootType}
          onChange={(e) => setLootType(e.target.value)}
          disabled={isMythic}
        >
          {LOOT_ALL.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Bosse */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Bosse</label>
        <input
          type="number"
          min={0}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={bosses}
          onChange={(e) => setBosses(e.target.value)}
        />
      </div>

      {/* Preset */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Preset</label>
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={presetId === null ? "" : presetId}
          onChange={(e) => setPresetId(e.target.value)}
        >
          <option value="">
            — {raid?.presetId ? `Aktuell: #${raid.presetId}` : "Keins"} —
          </option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name ?? `Preset #${p.id}`}
            </option>
          ))}
        </select>
      </div>

      {/* Lead */}
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Raidlead</label>
        <select
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          value={lead || ""}
          onChange={(e) => setLead(e.target.value)}
        >
          <option value="">
            — {raid?.leadDisplayName || raid?.leadUsername || raid?.lead || "Unverändert"} —
          </option>
          {leads.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          Anzeige nutzt DisplayName (Fallback Username/ID). Gespeichert wird die Discord-ID.
        </p>
      </div>

      {/* Aktionen */}
      <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/70"
          disabled={loading}
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="rounded-lg border border-emerald-700 bg-emerald-800 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-700/70"
          disabled={loading}
        >
          {loading ? "Speichere …" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
