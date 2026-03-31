// src/frontend/features/raids/hooks/useRaidDetail.js
import { useEffect, useMemo, useState } from "react";
import { apiListRaidSignups, apiPickSignup, apiUnpickSignup } from "../../../app/api/signupsAPI";
import { apiGetPresetById } from "../../../app/api/presetsAPI";

const U = (x) => String(x || "").toUpperCase();
const L = (x) => String(x || "").toLowerCase();

/* ---------- Label-Helper ---------- */
function fmtDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function labelDiff(d) {
  const v = U(d);
  if (v === "HC") return "Heroic";
  if (v === "NORMAL" || v === "NHC") return "Normal";
  if (v === "MYTHIC") return "Mythic";
  return d || "-";
}
function labelLoot(l) {
  const v = L(l);
  if (v === "saved") return "Saved";
  if (v === "unsaved") return "Unsaved";
  if (v === "vip") return "VIP";
  return l || "-";
}

/* ---------- Lead-Label ---------- */
function preferLeadName(raid) {
  // benutze alles, was der Backend-Controller evtl. liefert
  return raid?.leadDisplayName || raid?.leadUsername || raid?.lead || "-";
}

/* ---------- Role key ---------- */
function roleKey(t) {
  const v = L(t);
  if (v.startsWith("tank")) return "tanks";
  if (v.startsWith("heal")) return "heals";
  if (v.startsWith("dps")) return "dps";
  if (v.startsWith("loot")) return "loot";
  return "dps";
}

/* ---------- Preset->Caps ---------- */
function deriveCaps(preset) {
  if (!preset) return null;
  const tanks = Number(preset.tanks ?? preset.tank ?? preset.maxTanks ?? 0) || 0;
  const heals = Number(preset.healers ?? preset.heals ?? preset.heal ?? preset.maxHeals ?? 0) || 0;
  const dps   = Number(preset.dps ?? preset.maxDps ?? 0) || 0;
  const loot  = Number(preset.lootbuddies ?? preset.lootBuddies ?? preset.lootbuddy ?? preset.loot ?? preset.maxLootbuddies ?? 0) || 0;
  let caps = { tanks, heals, dps, loot };
  if (Array.isArray(preset.roles)) {
    const rmap = { ...caps };
    preset.roles.forEach((r) => {
      const key = roleKey(r.role || r.type);
      const cnt = Number(r.count ?? r.max ?? r.value ?? 0) || 0;
      rmap[key] = Math.max(rmap[key] || 0, cnt);
    });
    caps = rmap;
  }
  const total = (caps.tanks || 0) + (caps.heals || 0) + (caps.dps || 0) + (caps.loot || 0);
  return { ...caps, total };
}

/* ---------- Klassen-Normalisierung ---------- */
const CLASS_ORDER = [
  "Priest","Mage","Warlock","Druid","Rogue","Monk","Demon Hunter",
  "Hunter","Shaman","Evoker","Death Knight","Paladin","Warrior",
];
function normalizeClassName(raw) {
  const s = L(raw);
  if (s.includes("death") && s.includes("knight")) return "Death Knight";
  if (s.includes("demon") && s.includes("hunter")) return "Demon Hunter";
  const map = {
    priest: "Priest", mage: "Mage", warlock: "Warlock", druid: "Druid", rogue: "Rogue",
    monk: "Monk", hunter: "Hunter", shaman: "Shaman", evoker: "Evoker",
    paladin: "Paladin", warrior: "Warrior",
  };
  return map[s] || (raw ? String(raw) : "Unknown");
}

/* ---------- Buff/Utility Mapping ---------- */
const BUFF_DEFS = [
  { key: "INT",  label: "5% Intellect",        providers: ["Mage"] },
  { key: "AP",   label: "5% Attack Power",     providers: ["Warrior"] },
  { key: "STA",  label: "5% Stamina",          providers: ["Priest"] },
  { key: "PDMG", label: "5% Physical Damage",  providers: ["Monk"] },
  { key: "MDMG", label: "5% Magic Damage",     providers: ["Demon Hunter"] },
  { key: "DEVO", label: "Devotion Aura",       providers: ["Paladin"] },
  { key: "VERS", label: "3% Versatility",      providers: ["Druid"] },
  { key: "DR",   label: "3% Damage Reduction", providers: ["Paladin"] },
  { key: "HMARK",label: "Hunter's Mark",       providers: ["Hunter"] },
  { key: "SKYF", label: "Skyfury",             providers: ["Shaman"] },
];
const UTIL_DEFS = [
  { key: "LUST", label: "Bloodlust",               providers: ["Shaman","Mage","Evoker","Hunter"] },
  { key: "BREZ", label: "Combat Resurrection",     providers: ["Druid","Warlock","Death Knight"] },
  { key: "SPEED",label: "Movement Speed",          providers: ["Druid"] },
  { key: "HS",   label: "Healthstone",             providers: ["Warlock"] },
  { key: "GATE", label: "Gateway",                 providers: ["Warlock"] },
  { key: "INN",  label: "Innervate",               providers: ["Druid"] },
  { key: "AMZ",  label: "Anti Magic Zone",         providers: ["Death Knight"] },
  { key: "BOP",  label: "Blessing of Protection",  providers: ["Paladin"] },
  { key: "RALLY",label: "Rallying Cry",            providers: ["Warrior"] },
  { key: "DARK", label: "Darkness",                providers: ["Demon Hunter"] },
  { key: "IMM",  label: "Immunity",                providers: ["Paladin","Mage","Hunter"] },
];

/* ---------- Checklist aus Roster (PICKED) ---------- */
function buildChecklistFromRoster(rosterItems) {
  const classCounts = {};
  CLASS_ORDER.forEach((c) => (classCounts[c] = 0));
  for (const it of rosterItems) {
    const cls = normalizeClassName(it.classLabel || it.class || "");
    if (classCounts[cls] == null) classCounts[cls] = 0;
    classCounts[cls] += 1;
  }
  const classes = CLASS_ORDER.map((c) => ({ key: c, label: c, count: classCounts[c] || 0 }));
  const buffs = BUFF_DEFS.map((b) => ({
    key: b.key, label: b.label,
    count: b.providers.reduce((acc, p) => acc + (classCounts[p] || 0), 0),
  }));
  const utils = UTIL_DEFS.map((u) => ({
    key: u.key, label: u.label,
    count: u.providers.reduce((acc, p) => acc + (classCounts[p] || 0), 0),
  }));
  return { classes, buffs, utils };
}

/* ======================================================================= */
export default function useRaidDetail(raidId) {
  const [raid, setRaid] = useState(null);
  const [preset, setPreset] = useState(null);
  const [signups, setSignups] = useState([]);

  // Fehlerzustände trennen
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(() => new Set());

  function clearActionError() { setActionError(""); }

  useEffect(() => {
    if (!raidId || Number.isNaN(raidId)) return;
    const ac = new AbortController();

    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        // Raid
        let r = await fetch(`/api/raids/${raidId}`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (r.status === 304) {
          r = await fetch(`/api/raids/${raidId}?_=${Date.now()}`, {
            credentials: "include",
            cache: "no-store",
            signal: ac.signal,
          });
        }
        const raidJson = await r.json();
        if (!r.ok || !raidJson?.ok) throw new Error(raidJson?.error || `HTTP_${r.status}`);
        const rdata = raidJson.raid || null;
        setRaid(rdata);

        // Preset
        setPreset(null);
        if (rdata?.presetId != null) {
          try { setPreset((await apiGetPresetById(rdata.presetId)) || null); }
          catch { setPreset(null); }
        }

        // Me
        const meRes = await fetch(`/api/users/me`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        const meJson = meRes.ok ? await meRes.json() : {};
        setMe(meJson?.user || null);

        // Signups
        const list = await apiListRaidSignups(raidId);
        setSignups(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!ac.signal.aborted) setLoadError(e?.message || "LOAD_FAILED");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [raidId]);

  const canManage = useMemo(() => {
    if (!raid || !me) return false;
    const isLead = String(raid.lead || "") === String(me.discordId || me.id || "");
    return !!(me.isOwner || me.isAdmin || isLead);
  }, [raid, me]);

  const raidView = useMemo(() => {
    if (!raid) return null;
    return {
      id: raid.id,
      title: raid.title || "-",
      dateLabel: fmtDate(raid.date),
      diffLabel: labelDiff(raid.difficulty),
      lootLabel: labelLoot(raid.lootType),
      bosses: raid.bosses ?? "-",
      leadLabel: preferLeadName(raid),
    };
  }, [raid]);

  // 👉 wichtig: hier die Objekte so aufbereiten, dass Anzeige wirklich DisplayName bevorzugt
  const grouped = useMemo(() => {
    const base = () => ({ tanks: [], heals: [], dps: [], loot: [] });
    const g = { saved: base(), open: base() };

    (signups || []).forEach((s) => {
      const k = roleKey(s.type);
      const picked = s.saved || U(s.status) === "PICKED";

      // Daten aus Signup + Char + User ziehen
      const c = s.char || {};
      const whoChar =
        c?.name ? `${c.name}${c.realm ? "-" + c.realm : ""}` : null;

      const item = {
        id: s.id,
        // Anzeige-Felder (für UI)
        displayName: s.displayName || s.user?.displayName || s.userDisplayName || null,
        username: s.username || s.user?.username || null,
        who: whoChar || s.displayName || s.user?.displayName || s.userId || "-", // Fallback
        // Verlinkungen / Detail-Infos
        userId: s.userId || null,
        user: s.user || null,
        char: s.char || null,
        charName: c.name || null,
        charRealm: c.realm || null,
        classLabel: c.class || s.class || "",
        specLabel: c.spec || s.spec || "",
        itemLevel: c.itemLevel ?? null,
        wclUrl: c.wclUrl || null,
        region: c.region || s.region || "eu",

        // Meta
        roleLabel: U(s.type || "-"),
        note: s.note || "",
        saved: !!picked,
        statusLabel: U(s.status || "-"),
      };

      if (picked) g.saved[k].push(item);
      else g.open[k].push(item);
    });

    return g;
  }, [signups]);

  // Caps & Counts
  const caps = useMemo(() => deriveCaps(preset), [preset]);
  const counts = useMemo(() => {
    const r = {
      tanks: grouped.saved.tanks.length,
      heals: grouped.saved.heals.length,
      dps: grouped.saved.dps.length,
      loot: grouped.saved.loot.length,
    };
    const s = {
      tanks: grouped.open.tanks.length,
      heals: grouped.open.heals.length,
      dps: grouped.open.dps.length,
      loot: grouped.open.loot.length,
    };
    const rTotal = r.tanks + r.heals + r.dps + r.loot;
    const sTotal = s.tanks + s.heals + s.dps + s.loot;
    return { roster: { ...r, total: rTotal }, signups: { ...s, total: sTotal } };
  }, [grouped]);

  // Checklist (nur Roster / PICKED)
  const checklist = useMemo(() => {
    const rosterItems = [
      ...(grouped?.saved?.tanks || []),
      ...(grouped?.saved?.heals || []),
      ...(grouped?.saved?.dps || []),
      ...(grouped?.saved?.loot || []),
    ];
    return buildChecklistFromRoster(rosterItems);
  }, [grouped]);

  // Aktionen
  async function pick(id) {
    if (!id) return;
    setActionError("");
    setBusyIds((s) => new Set([...s, id]));
    try {
      await apiPickSignup(id);
      setSignups((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "PICKED", saved: true } : s))
      );
    } catch (e) {
      setActionError(e?.message || "PICK_FAILED");
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }
  async function unpick(id) {
    if (!id) return;
    setActionError("");
    setBusyIds((s) => new Set([...s, id]));
    try {
      await apiUnpickSignup(id);
      setSignups((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "SIGNUPED", saved: false } : s))
      );
    } catch (e) {
      setActionError(e?.message || "UNPICK_FAILED");
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  return {
    raid: raidView,
    grouped,
    caps,
    counts,
    checklist,
    canManage,
    loading,
    loadError,
    actionError,
    clearActionError,
    pick,
    unpick,
    busyIds,
  };
}
