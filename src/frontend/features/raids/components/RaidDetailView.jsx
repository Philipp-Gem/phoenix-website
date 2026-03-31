// src/frontend/features/raids/components/RaidDetailView.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

// Shared-Icons/Maps
import { getClassIcon, getRoleIcon, getClassLabel } from "../../../shared/lib/iconMaps.js";
import Icon from "../../../shared/components/ClassIcons.jsx";

import RaidEditForm from "./RaidEditForm.jsx";

/* ===========================
   Kleine UI-Helfer
   =========================== */
function Section({ title, children, right }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
function InfoItem({ label, value }) {
  return (
    <div className="py-2">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 truncate text-sm text-zinc-100">{value ?? "-"}</div>
    </div>
  );
}
function RoleHeader({ roleKey, title, suffix }) {
  const roleIcon = getRoleIcon(roleKey);
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
      <Icon src={roleIcon} alt={title} size={16} />
      <span>
        {title} {suffix ? <span className="text-zinc-500">({suffix})</span> : null}
      </span>
    </div>
  );
}

/* ===========================
   Anzeige-Helfer
   =========================== */
function primaryDisplayName(s) {
  return (
    s.displayName ||
    s.signup?.displayName ||
    (s.user && (s.user.displayName || s.user.username)) ||
    s.userDisplayName ||
    s.discordDisplayName ||
    s.discordName ||
    s.username ||
    s.who ||
    s.charLabel ||
    s.charName ||
    s.name ||
    "-"
  );
}
function charLabel(s) {
  const c = s.char || {};
  const name = s.charName || s.name || c.name;
  const realm = s.charRealm || s.realm || c.realm;
  if (name && realm) return `${name}-${realm}`;
  return name || realm || "";
}
function buildWclUrl(s) {
  const c = s.char || {};
  const direct = s.wclUrl || s.charWclUrl || c.wclUrl;
  if (direct) return direct;
  const region = (s.region || s.charRegion || "eu").toLowerCase();
  const nm = s.charName || s.name || c.name;
  const rm = s.charRealm || s.realm || c.realm;
  if (nm && rm) {
    return `https://www.warcraftlogs.com/character/${encodeURIComponent(region)}/${encodeURIComponent(rm)}/${encodeURIComponent(nm)}`;
  }
  const term = primaryDisplayName(s) || "";
  if (term) return `https://www.warcraftlogs.com/search/?term=${encodeURIComponent(term)}`;
  return null;
}

/* ===========================
   Zeilen-/Listen-Komponenten
   =========================== */
function SignupLine({ s }) {
  const c = s?.char || {};
  const name = c?.name
    ? `${c.name}${c?.realm ? "-" + c.realm : ""}`
    : (s?.displayName || s?.userId || "Unbekannt");

  const klass = c?.class || s?.class || "";
  const spec = c?.spec || s?.spec || "";
  const itemLevel = c?.itemLevel ?? s?.itemLevel ?? null;
  const note = s?.note || null;

  return (
    <li className="text-sm leading-6">
      <span className="opacity-90">
        • {klass ? `${name} (${klass}${spec ? " • " + spec : ""})` : `${name}${spec ? " (" + spec + ")" : ""}`}
      </span>
      {itemLevel ? <span className="opacity-70"> • ilvl {itemLevel}</span> : null}
      {note ? <span className="opacity-70"> • {note}</span> : null}
    </li>
  );
}

function Column({ roleKey, title, suffix, items, canManage, onPick, onUnpick, busyIds, picked }) {
  return (
    <div>
      <RoleHeader roleKey={roleKey} title={title} suffix={suffix} />
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-500">
            keine
          </div>
        ) : (
          items.map((s) => {
            const c = s.char || {};
            const klass = (s.class || s.classLabel || c.class || "").toString().toLowerCase();
            const classIcon = getClassIcon(klass);
            const classAlt = getClassLabel(klass);
            const titleName = primaryDisplayName(s);

            const parts = [];
            const cl = charLabel(s);
            if (cl) parts.push(cl);
            const spec = s.specLabel || s.spec || c.spec;
            if (spec) parts.push(spec);
            const ilvl = c.itemLevel ?? s.itemLevel;
            if (ilvl) parts.push(`${ilvl} ilvl`);
            if (s.roleLabel) parts.push(s.roleLabel);
            if (s.note) parts.push(s.note);
            const subtitle = parts.join(" • ");
            const wclUrl = buildWclUrl(s);

            const isBusy = !!busyIds?.has?.(s.id);

            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <Icon src={classIcon} alt={classAlt} title={classAlt} size={16} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-zinc-100">{titleName}</div>
                    <div className="text-xs text-zinc-400">{subtitle}</div>
                  </div>
                </div>

                <div className="ml-3 flex shrink-0 items-center gap-2">
                  {wclUrl && (
                    <a
                      href={wclUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Warcraft Logs öffnen"
                      className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200 hover:bg-indigo-500/20"
                    >
                      WCL ↗
                    </a>
                  )}
                  {canManage && picked && (
                    <button
                      className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                      onClick={() => onUnpick?.(s.id)}
                      disabled={isBusy}
                      title="Aus Roster entfernen"
                    >
                      Unpick
                    </button>
                  )}
                  {canManage && !picked && (
                    <button
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                      onClick={() => onPick?.(s.id)}
                      disabled={isBusy}
                      title="Zum Roster hinzufügen"
                    >
                      Pick
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ===========================
   Checklist / Buffs
   =========================== */
const KNOWN_CLASS_BUFFS = {
  mage: ["5% Intellect"],
  priest: ["Stamina"],
  warrior: ["Battle Shout"],
  druid: ["Mark of the Wild"],
  monk: ["Mystic Touch"],
  dh: ["Chaos Brand"],
  shaman: ["Windfury"],
  evoker: ["Hero/Lust"],
  paladin: ["Devotion Aura"],
  hunter: [],
  rogue: [],
  dk: [],
  warlock: ["Healthstones", "Summon"],
};
const CORE_BUFF_MATCHERS = {
  mage: [/intellect/i],
  priest: [/stamina|ausdauer/i],
  warrior: [/battle\s*shout|kampfschrei/i],
  druid: [/mark\s*of\s*the\s*wild|mal\s*der\s*wildnis/i],
  monk: [/mystic\s*touch/i],
  dh: [/chaos\s*brand/i],
  shaman: [/windfury/i],
};
function normalizeKey(k) { return (k || "").toString().trim().toLowerCase(); }
function joinBuffsText(buffs) {
  return buffs.map((b) => (typeof b.count === "number" ? `${b.label} (${b.count})` : b.label)).join(", ");
}

/* ===========================
   Panel: Roster im Discord posten (immer User-Ping)
   =========================== */
function PostRosterPanel({ raid }) {
  const [posting, setPosting] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");

  async function handlePost() {
    if (!raid?.id) return;
    setPosting(true);
    setError("");
    setResultUrl("");

    try {
      const res = await fetch("/api/roster/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ raidId: raid.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Roster post failed");
      setResultUrl(data.messageUrl || "");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
      <div className="mb-2 text-sm font-semibold text-amber-300">
        Roster (picked) im Discord posten
      </div>
      <div className="mb-3 text-xs text-zinc-300">
        Beim Posten werden <b>alle gepickten Booster</b> automatisch per <code>@Discord-Tag</code> erwähnt (keine Rollen).
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handlePost}
          disabled={posting}
          className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {posting ? "Poste..." : "Roster posten & Booster pingen"}
        </button>
        {resultUrl ? (
          <a
            href={resultUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-amber-300 underline hover:text-amber-200"
          >
            Zur Discord-Nachricht
          </a>
        ) : null}
        {error ? <span className="text-sm text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}

/* ===========================
   Hauptansicht
   =========================== */
export default function RaidDetailView({
  raid,
  grouped,
  caps,
  counts,
  checklist,
  canManage,
  pick,
  unpick,
  busyIds,
  onReload,
}) {
  const [editing, setEditing] = useState(false);

  if (!raid) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Raid nicht gefunden.
      </div>
    );
  }

  const rosterTotal = counts?.roster?.total || 0;
  const signupsTotal = counts?.signups?.total || 0;
  const capTotal = caps?.total ?? null;

  const buffsByClass = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(checklist?.buffs) ? checklist.buffs : [];
    for (const b of list) {
      const k = normalizeKey(b.classKey || b.source || b.by || b.owner || b.key);
      if (!k) continue;
      const arr = map.get(k) || [];
      arr.push({
        key: b.key || b.label || `${k}-${arr.length}`,
        label: b.label || b.key || "",
        count: typeof b.count === "number" ? b.count : undefined,
      });
      map.set(k, arr);
    }
    for (const [klass, defaults] of Object.entries(KNOWN_CLASS_BUFFS)) {
      if (!map.has(klass) && defaults?.length) {
        map.set(
          klass,
          defaults.map((lbl, i) => ({ key: `${klass}-${i}`, label: lbl }))
        );
      }
    }
    return map;
  }, [checklist]);

  const isClassImportant = (klass) => {
    if (klass === "warlock" || klass === "dh") return true;
    const buffs = buffsByClass.get(klass) || [];
    const matchers = CORE_BUFF_MATCHERS[klass];
    if (!matchers || !matchers.length) return false;
    return buffs.some((b) => matchers.some((rx) => rx.test(b.label || "")));
  };

  const warlockCount =
    (checklist?.classes || []).find((c) => normalizeKey(c.key || c.label) === "warlock")?.count || 0;

  return (
    <div className="space-y-4">
      {/* Kopfzeile */}
      <Section
        title={raid.title}
        right={
          <div className="flex items-center gap-3">
            <div className="text-xs text-zinc-400">
              <span className="mr-3">
                Roster (picked):{" "}
                <b className="text-zinc-100">
                  {rosterTotal}
                  {capTotal != null ? ` / ${capTotal}` : ""}
                </b>
              </span>
              <span>
                Signups: <b className="text-zinc-100">{signupsTotal}</b>
              </span>
            </div>
            {canManage && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-sky-700 bg-sky-900/40 px-2 py-1 text-xs text-sky-100 hover:bg-sky-900/60"
              >
                Bearbeiten
              </button>
            )}
            {canManage && editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                Schließen
              </button>
            )}
            <Link
              to="/raids"
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
            >
              Zurück
            </Link>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <InfoItem label="Datum" value={raid.dateLabel} />
          <InfoItem label="Difficulty" value={raid.diffLabel} />
          <InfoItem label="Loot" value={raid.lootLabel} />
          <InfoItem label="Bosses" value={raid.bosses} />
          <InfoItem label="Lead" value={raid.leadLabel} />
        </div>
      </Section>

      {/* Edit-Form */}
      {canManage && editing && (
        <Section title="Raid bearbeiten">
          <RaidEditForm
            raid={raid}
            onSaved={async () => {
              setEditing(false);
              try { await onReload?.(); } catch {}
            }}
            onCancel={() => setEditing(false)}
          />
        </Section>
      )}

      {/* Roster posten: pingt IMMER alle gepickten Booster */}
      {canManage && (
        <Section title="Roster posten">
          <PostRosterPanel raid={raid} />
        </Section>
      )}

      {/* Roster (picked) */}
      <Section title="Roster (picked)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Column
            roleKey="tank"
            title="Tanks"
            suffix={typeof caps?.tanks === "number" ? `${(counts?.roster?.tanks || 0)} / ${caps.tanks}` : `${(counts?.roster?.tanks || 0)}`}
            items={grouped?.saved?.tanks || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            roleKey="dps"
            title="DPS"
            suffix={typeof caps?.dps === "number" ? `${(counts?.roster?.dps || 0)} / ${caps.dps}` : `${(counts?.roster?.dps || 0)}`}
            items={grouped?.saved?.dps || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            roleKey="heal"
            title="Healers"
            suffix={typeof caps?.heals === "number" ? `${(counts?.roster?.heals || 0)} / ${caps.heals}` : `${(counts?.roster?.heals || 0)}`}
            items={grouped?.saved?.heals || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
          <Column
            roleKey="lootbuddy"
            title="Lootbuddies"
            suffix={typeof caps?.loot === "number" ? `${(counts?.roster?.loot || 0)} / ${caps.loot}` : `${(counts?.roster?.loot || 0)}`}
            items={grouped?.saved?.loot || []}
            picked
            canManage={canManage}
            onUnpick={unpick}
            busyIds={busyIds}
          />
        </div>
      </Section>

      {/* Offene Signups */}
      <Section title="Signups (offen)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Column roleKey="tank" title="Tanks" suffix={`${counts?.signups?.tanks || 0}`} items={grouped?.open?.tanks || []} canManage={canManage} onPick={pick} busyIds={busyIds} />
          <Column roleKey="dps" title="DPS" suffix={`${counts?.signups?.dps || 0}`} items={grouped?.open?.dps || []} canManage={canManage} onPick={pick} busyIds={busyIds} />
          <Column roleKey="heal" title="Healers" suffix={`${counts?.signups?.heals || 0}`} items={grouped?.open?.heals || []} canManage={canManage} onPick={pick} busyIds={busyIds} />
          <Column roleKey="lootbuddy" title="Lootbuddies" suffix={`${counts?.signups?.loot || 0}`} items={grouped?.open?.loot || []} canManage={canManage} onPick={pick} busyIds={busyIds} />
        </div>
      </Section>

      {/* Checklist */}
      <Section title="Checklist">
        {warlockCount === 0 && (
          <div className="mb-3 rounded-lg border border-amber-600 bg-amber-900/30 px-3 py-2 text-amber-200 text-sm">
            <span className="font-semibold">Hinweis:</span> Kein <b>Warlock</b> im Roster.
            Für sichere Pulls (Healthstones/Summon) wird dringend ein Warlock empfohlen.
          </div>
        )}

        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">Wichtige Klassen</div>
        <ImportantOptionalList checklist={checklist} important />
        <div className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Optionale Klassen</div>
        <ImportantOptionalList checklist={checklist} important={false} />
      </Section>
    </div>
  );
}

/* ===========================
   Listen für wichtige/optionale Klassen
   =========================== */
function ImportantOptionalList({ checklist, important }) {
  const items = useMemo(() => {
    const classes = Array.isArray(checklist?.classes) ? checklist.classes : [];
    const buffsByClass = new Map();

    Object.entries(KNOWN_CLASS_BUFFS).forEach(([klass, list]) => {
      if (!buffsByClass.has(klass)) {
        buffsByClass.set(
          klass,
          (list || []).map((lbl, i) => ({ key: `${klass}-${i}`, label: lbl }))
        );
      }
    });

    const arr = classes.map((it) => {
      const key = normalizeKey(it.key || it.label);
      const label = it.label || getClassLabel(key) || it.key || key;
      const count = it.count || 0;
      const icon = getClassIcon(key);
      const buffsText = joinBuffsText(buffsByClass.get(key) || []);
      return { key, label, count, icon, buffsText, isImportant: isClassImportant(key) };
    });

    function isImportantFn(klass) {
      if (klass === "warlock" || klass === "dh") return true;
      const matchers = CORE_BUFF_MATCHERS[klass];
      if (!matchers || !matchers.length) return false;
      const text = (buffsByClass.get(klass) || []).map((b) => b.label).join(" ");
      return matchers.some((rx) => rx.test(text));
    }
    function isClassImportant(klass) { return isImportantFn(klass); }

    const filtered = arr
      .filter((c) => c.isImportant === !!important)
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));

    return filtered;
  }, [checklist, important]);

  if (!items.length) return <div className="text-sm text-zinc-500">keine</div>;

  return (
    <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <div key={`${important ? "imp" : "opt"}-${c.key}`} className="flex items-center gap-2 text-sm">
          <Icon src={c.icon} alt={c.label} size={16} className="shrink-0" />
          <span className="w-6 tabular-nums font-medium text-emerald-400">{c.count}×</span>
          <span className="truncate text-zinc-200">
            {c.label}
            {c.buffsText ? <span className="text-zinc-400"> ({c.buffsText})</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
