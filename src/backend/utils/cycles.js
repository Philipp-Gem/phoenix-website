// src/backend/utils/cycle.js
// Deterministische Cycle-Berechnung für Europe/Berlin
// Cycle: Montag 08:00 (inkl.) → nächster Montag 07:00 (exkl.)

const { DateTime } = require("luxon");

const ZONE = "Europe/Berlin";

/** interner Helper: Montag 08:00 der „aktuellen“ ISO-Woche relativ zu d */
function weekMonday0800(d) {
  let mon0800 = d.set({
    weekday: 1, // ISO: 1 = Montag
    hour: 8,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  // Liegt d vor Mo 08:00, gehört es noch zum vorherigen Cycle
  if (d < mon0800) mon0800 = mon0800.minus({ weeks: 1 });
  return mon0800;
}

/**
 * Grenzen des Cycles, der "now" enthält.
 * start: Montag 08:00 (inkl.)
 * end:   nächster Montag 07:00 (exkl.)
 */
function getCycleBounds(now = new Date()) {
  const d = DateTime.fromJSDate(now, { zone: ZONE });
  const startDT = weekMonday0800(d);
  const endDT = startDT.plus({ weeks: 1 }).set({
    hour: 7,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  return { start: startDT.toJSDate(), end: endDT.toJSDate(), zone: ZONE };
}

/** True, wenn ts im Cycle von ref liegt (start <= ts < end) */
function isInCycle(ts, ref = new Date()) {
  const { start, end } = getCycleBounds(ref);
  const t = +new Date(ts);
  return t >= +start && t < +end;
}

/** True, wenn a und b im selben Cycle liegen */
function sameCycle(a, b) {
  const A = getCycleBounds(a);
  const B = getCycleBounds(b);
  return +A.start === +B.start && +A.end === +B.end;
}

/** Schöner Label-Text für UI/Logs, z. B. "KW 41 — 06.10 08:00 → 13.10 07:00" */
function formatCycleLabel(bounds = getCycleBounds()) {
  const { start, end } = bounds;
  const s = DateTime.fromJSDate(start, { zone: ZONE });
  const e = DateTime.fromJSDate(end, { zone: ZONE });
  const kw = s.weekNumber;
  return `KW ${kw} — ${s.toFormat("dd.LL HH:mm")} → ${e.toFormat("dd.LL HH:mm")}`;
}

/**
 * Convenience für Prisma: Date-Range-Filter des aktuellen Cycles.
 * Beispiel:
 *   const { prismaDateBetween } = require("../utils/cycle");
 *   const where = { date: prismaDateBetween("date").date };
 *   // oder direkt spreaden: { ...prismaDateBetween("date", raidDate) }
 */
function prismaDateBetween(field = "date", ref = new Date()) {
  const { start, end } = getCycleBounds(ref);
  return { [field]: { gte: start, lt: end } };
}

module.exports = {
  ZONE,
  getCycleBounds,
  isInCycle,
  sameCycle,
  formatCycleLabel,
  prismaDateBetween,
};
