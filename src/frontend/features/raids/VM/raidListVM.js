// src/frontend/features/raids/vm/raidListVM.js

function diffLabel(d) {
  const v = String(d || "").toUpperCase();
  if (v === "HC") return "HC";
  if (v === "NORMAL" || v === "NHC") return "Normal";
  if (v === "MYTHIC") return "Mythic";
  return d || "-";
}

function lootLabel(l) {
  const v = String(l || "").toLowerCase();
  if (v === "vip") return "VIP";
  if (v === "saved") return "Saved";
  if (v === "unsaved") return "Unsaved";
  return l || "-";
}

function toDateTimeLabels(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) {
    return { dateLabel: "-", timeLabel: "-" };
  }
  return {
    dateLabel: d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }),
    timeLabel: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function leadLabel(leadValue, leads = []) {
  const s = leadValue == null ? "" : String(leadValue);
  const found =
    leads.find((u) => String(u.id) === s) ||
    leads.find((u) => String(u.discordId) === s);
  return found?.displayName || found?.username || found?.globalName || found?.name || s || "-";
}

/**
 * Baut die Zeilen für die "dumme" RaidListTable auf.
 */
export function buildRaidRowsVm(raids = [], leads = []) {
  return (Array.isArray(raids) ? raids : []).map((r) => {
    const { dateLabel, timeLabel } = toDateTimeLabels(r.date);
    return {
      id: r.id,
      title: r.title || "-",
      dateLabel,
      timeLabel,
      difficultyLabel: diffLabel(r.difficulty),
      lootLabel: lootLabel(r.lootType),
      bossesLabel: r.bosses ?? "-",
      leadLabel: leadLabel(r.lead, leads),
      detailUrl: `/raids/${r.id}`,
    };
  });
}
