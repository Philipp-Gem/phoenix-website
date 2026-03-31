// src/frontend/features/my-raids/hooks/useMyRaids.js
import { useEffect, useMemo, useState } from "react";
import { fetchMyRaidsAll } from "../../../app/api/myRaidsAPI.js";

// feste Labels exakt wie Backend: vip | saved | unsaved
const DIFF_LABEL = { NM: "Normal", HC: "Heroic", MY: "Mythic" };
const LOOT_LABEL = { vip: "VIP", saved: "Saved", unsaved: "Unsaved" };

function fmtDateLabel(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

// robust: akzeptiert verschiedene Response-Shapes von /api/users/leads
async function fetchLeadsMap() {
  try {
    const res = await fetch("/api/users/leads", { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json().catch(() => ({}));
    const arr =
      Array.isArray(json?.items) ? json.items :
      Array.isArray(json?.leads) ? json.leads :
      Array.isArray(json)        ? json :
      [];

    const map = Object.create(null);
    for (const u of arr) {
      const id   = String(u.discordId ?? u.id ?? u.userId ?? "");
      const name = u.displayName ?? u.username ?? u.name ?? null;
      if (id && name) map[id] = name;
    }
    return map;
  } catch {
    return {}; // leise failen → wir zeigen fallback "-"
  }
}

function toCardItem(entry, leadsMap) {
  const r = entry.raid || {};
  const s = entry.signup || {};
  const c = entry.char || {};

  const leadId = r.lead ? String(r.lead) : null;
  const leadDisplay =
    (leadId && leadsMap?.[leadId]) ||
    r.leadDisplay || r.leadName ||
    null;

  const loot = (r.lootType || "").toLowerCase();
  const lootLabel = LOOT_LABEL[loot] ?? (loot ? loot.toUpperCase() : "-");

  let difficultyLabel = "-";
  const d = String(r.difficulty || "").toUpperCase();
  if (d === "HC") difficultyLabel = "Heroic";
  else if (d === "NHC" || d === "NORMAL") difficultyLabel = "Normal";
  else if (d === "MYTHIC" || d === "M+") difficultyLabel = "Mythic";

  return {
    raidId: r.id,
    title: r.title || "-",
    date: r.date,
    dateLabel: fmtDateLabel(r.date),
    difficulty: r.difficulty,
    difficultyLabel,
    lootType: loot,
    lootLabel,
    bosses: r.bosses ?? "-",

    // Lead-Ausgabe als DisplayName (Fallback "-")
    leadId,
    leadDisplay: leadDisplay || "-",

    // wir listen nur PICKED (der Hook filtert unten)
    status: s.status || "PICKED",
    role: s.type || null,

    // Char Infos
    charName: c?.name || null,
    charRealm: c?.realm || null,
    charClass: c?.class || null,
    itemLevel: c?.itemLevel || null,
  };
}

export default function useMyRaids() {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [raw, setRaw]           = useState({
    upcoming: { rostered: [], signups: [] },
    past:     { rostered: [], signups: [] },
  });
  const [leadsMap, setLeadsMap] = useState({});

  // Daten + Leads parallel laden
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [json, lm] = await Promise.all([fetchMyRaidsAll(), fetchLeadsMap()]);
        if (!abort) {
          setRaw({
            upcoming: json.upcoming || { rostered: [], signups: [] },
            past:     json.past     || { rostered: [], signups: [] },
          });
          setLeadsMap(lm || {});
        }
      } catch (e) {
        if (!abort) setError(e);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // Nur ROSTERED (PICKED) anzeigen
  const upcoming = useMemo(() => {
    const picked = Array.isArray(raw?.upcoming?.rostered) ? raw.upcoming.rostered : [];
    return picked.map(e => toCardItem(e, leadsMap)).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [raw.upcoming, leadsMap]);

  const past = useMemo(() => {
    const picked = Array.isArray(raw?.past?.rostered) ? raw.past.rostered : [];
    return picked.map(e => toCardItem(e, leadsMap)).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [raw.past, leadsMap]);

  return { loading, error, upcoming, past };
}
