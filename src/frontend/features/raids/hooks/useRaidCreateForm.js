// src/frontend/features/raids/hooks/useRaidCreateForm.js
import { useEffect, useMemo, useState } from "react";
import { apiListPresets } from "@app/api/presetsAPI";

function fmtDE(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d)) return iso || "-";
    return d.toLocaleString("de-DE");
  } catch {
    return iso || "-";
  }
}

function mapErrorToMessage(payload) {
  if (!payload) return "Unbekannter Fehler bei der Raid-Erstellung.";
  if (typeof payload === "string") return payload;

  if (payload.message) return payload.message;

  const code = String(payload.error || "").toUpperCase();
  if (code === "DATE_PAST") return "Das ausgewählte Datum liegt in der Vergangenheit.";
  if (code === "DATE_OUTSIDE_ALLOWED_CYCLES") {
    const b = payload.bounds || {};
    const curStart = fmtDE(b.currentCycleStart);
    const nextEnd  = fmtDE(b.nextCycleEnd);
    return `Datum außerhalb des erlaubten Fensters. Erlaubt: ${curStart} bis ${nextEnd} (aktueller + nächster Cycle).`;
  }
  if (code === "INVALID_DATE") return "Ungültiges Datum.";
  if (code === "INVALID_BOSSES") return "Die Anzahl der Bosse ist ungültig.";

  return `Fehler: ${payload.error || "SERVER_ERROR"}`;
}

export default function useRaidCreateForm({ me, canPickLead, onCreate }) {
  const DEFAULT_RAID_NAME =
    (import.meta?.env?.VITE_DEFAULT_RAID_NAME || "Manaforge").toString().trim() || "Manaforge";

  // --- Presets -------------------------------------------------------------
  const [presets, setPresets]   = useState([]);
  const [presetId, setPresetId] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await apiListPresets();
        if (!alive) return;
        setPresets(Array.isArray(list) ? list : []);
      } catch {
        if (!alive) return;
        setPresets([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // --- Form-State ----------------------------------------------------------
  const [difficulty, setDifficulty] = useState("HC");          // "HC" | "Mythic" | "Normal"
  const [lootType, setLootType] = useState("vip");             // "vip" | "saved" | "unsaved"
  const [date, setDate] = useState("");                        // datetime-local
  const [bosses, setBosses] = useState(8);                     // HC/Normal = 8 / bei Mythic 1..8
  const [lead, setLead] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isMythic = difficulty === "Mythic";

  // Mythic erzwingt VIP & min. 1 Boss
  useEffect(() => {
    if (isMythic) {
      if (!Number(bosses) || Number(bosses) < 1) setBosses(1);
      setLootType("vip");
    } else {
      setBosses(8);
      if (!["vip", "saved", "unsaved"].includes(lootType)) setLootType("vip");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMythic]);

  const lootOptions = useMemo(() => {
    return isMythic
      ? [{ value: "vip", label: "VIP" }]
      : [
          { value: "saved", label: "Saved" },
          { value: "unsaved", label: "Unsaved" },
          { value: "vip", label: "VIP" },
        ];
  }, [isMythic]);

  function labelDifficulty(d) {
    if (d === "HC") return "HC";
    if (d === "Mythic") return "Mythic";
    return "Normal";
  }
  function labelLoot(t) {
    if (t === "vip") return "VIP";
    if (t === "saved") return "Saved";
    if (t === "unsaved") return "Unsaved";
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
  }

  const autoTitle = useMemo(() => {
    const diff = labelDifficulty(difficulty);
    const loot = labelLoot(lootType);
    if (isMythic) {
      const b = Math.max(1, Number(bosses) || 1);
      return `${DEFAULT_RAID_NAME} ${diff} ${loot} ${b}/8`;
    }
    return `${DEFAULT_RAID_NAME} ${diff} ${loot}`;
  }, [DEFAULT_RAID_NAME, difficulty, lootType, bosses, isMythic]);

  function clearError() {
    setError("");
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const when = date ? new Date(date) : new Date();

      const payload = {
        title: autoTitle,
        difficulty: difficulty || "HC",
        lootType: lootType || "vip",
        date: when.toISOString(),
        bosses: isMythic ? Number(bosses) || 8 : 8,
        // Lead: Wenn Admin/Owner einen Lead wählt -> schicken; sonst NICHT schicken (Backend setzt automatisch mich)
        lead: canPickLead ? (lead || null) : null,
        // Preset-ID (optional)
        presetId: presetId ? Number(presetId) : null,
      };

      const res = await onCreate(payload);
      if (!res || res.ok !== true) {
        throw res?.error || { error: "SERVER_ERROR" };
      }

      setBosses(isMythic ? 1 : 8);
      setSubmitting(false);
      return res;
    } catch (e) {
      setError(mapErrorToMessage(e));
      setSubmitting(false);
      return { ok: false, error: e };
    }
  }

  return {
    // state + setter
    date, setDate,
    difficulty, setDifficulty,
    lootType, setLootType,
    bosses, setBosses,
    lead, setLead,

    // Presets
    presets,
    presetId, setPresetId,

    // computed
    isMythic,
    lootOptions,
    autoTitle,

    // status
    submitting,
    error,
    clearError,

    // actions
    submit,
  };
}
