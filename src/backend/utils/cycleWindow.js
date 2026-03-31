// src/backend/utils/cycleWindow.js
// CommonJS utility: berechnet das aktuelle und nächste Cycle-Fenster
// Cycle-Regel: Mittwoch 08:00 bis nächsten Mittwoch 07:00 (Europe/Berlin)

const TZ = "Europe/Berlin";

/**
 * Wandelt eine lokale Berlin-Zeit (Jahr/Monat/Tag/Stunde/Minute/...) in ein UTC-Date um.
 * Hinweis: Wir vermeiden hier vollständig das Parsen von Locale-Strings.
 */
function fromLocalParts(year, monthIdx, day, hour = 0, minute = 0, second = 0, ms = 0) {
  // Wir bauen ein “naives” Date mit den Komponenten (in System-TZ),
  // ziehen den aktuellen Offset ab und erhalten damit den UTC-Zeitpunkt.
  const yyyy = String(year).padStart(4, "0");
  const mm   = String(monthIdx + 1).padStart(2, "0");
  const dd   = String(day).padStart(2, "0");
  const HH   = String(hour).padStart(2, "0");
  const MM   = String(minute).padStart(2, "0");
  const SS   = String(second).padStart(2, "0");

  // Achtung: Das ist ein lokales Datum (System-TZ), KEIN ISO mit Z!
  const local = new Date(`${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}.${String(ms).padStart(3, "0")}`);
  const offsetMin = -local.getTimezoneOffset(); // Minutenversatz der System-TZ relativ zu UTC
  const utcMs = local.getTime() - offsetMin * 60 * 1000;
  return new Date(utcMs);
}

/**
 * Liefert das Cycle-Fenster (start, end) für ein beliebiges Datum.
 * Definition:
 *  - Start: Der letzte Mittwoch um 08:00 (Berlin)
 *  - Ende:  Der darauffolgende Mittwoch um 07:00 (Berlin)
 */
function getCycleWindowFor(dateInput = new Date()) {
  const d = new Date(dateInput);

  // Lokale Berliner "Wallclock"-Zeit ermitteln, aber OHNE Locale-Parsing:
  // Wir holen die realen Komponenten über die Systemzeit (vereinfachend).
  // Für stabile Wochentags-Berechnung nutzen wir ein “lokales” Date-Objekt,
  // das denselben Zeitpunkt repräsentiert.
  const localNow = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());

  // Wochentag: JS 0=So ... 6=Sa
  const wd = localNow.getDay(); // 0..6
  const daysBackToWed = (wd - 3 + 7) % 7; // Mittwoch = 3

  // Start = letzter Mittwoch 08:00 (lokal)
  const startLocal = new Date(
    localNow.getFullYear(),
    localNow.getMonth(),
    localNow.getDate() - daysBackToWed,
    8, 0, 0, 0
  );

  // Ende = nächster Mittwoch 07:00 (lokal)
  // = Start + 6 Tage + 23 Stunden (31h)
  const endLocal = new Date(
    startLocal.getFullYear(),
    startLocal.getMonth(),
    startLocal.getDate() + 6,
    7 + 24, 0, 0, 0
  );

  // In echte UTC-Zeitpunkte umrechnen
  const start = fromLocalParts(
    startLocal.getFullYear(),
    startLocal.getMonth(),
    startLocal.getDate(),
    startLocal.getHours(),
    startLocal.getMinutes(),
    startLocal.getSeconds(),
    0
  );
  const end = fromLocalParts(
    endLocal.getFullYear(),
    endLocal.getMonth(),
    endLocal.getDate(),
    endLocal.getHours(),
    endLocal.getMinutes(),
    endLocal.getSeconds(),
    0
  );

  return { start, end, timeZone: TZ };
}

/** Aktuelles Fenster (für "jetzt") */
function getCurrentCycleWindow(now = new Date()) {
  return getCycleWindowFor(now);
}

/**
 * Nächstes Fenster:
 * Start = Ende des aktuellen Fensters
 * Ende  = Start + 7 Tage
 * (ohne Locale-Parsing; nur Timestamp-Math)
 */
function getNextCycleWindow(now = new Date()) {
  const { end } = getCycleWindowFor(now);
  const start = new Date(end.getTime());
  const endNext = new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end: endNext, timeZone: TZ };
}

module.exports = {
  TZ,
  getCycleWindowFor,
  getCurrentCycleWindow,
  getNextCycleWindow,
};
