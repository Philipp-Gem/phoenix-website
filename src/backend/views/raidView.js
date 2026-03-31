// src/backend/views/raidView.js
/**
 * View-Layer für Raids
 * Formatiert Daten aus dem Model für API-Antworten.
 * Trennung von Logik (Service) und Darstellung (API-Response).
 */

/**
 * Formatiert ein einzelnes Raid-Objekt in die Standardausgabe.
 */
exports.toRaidResponse = (raid) => {
  if (!raid) return null;
  return {
    id: raid.id,
    title: raid.title,
    difficulty: raid.difficulty,
    lootType: raid.lootType,
    date: raid.date,
    lead: raid.lead || "TBD",
    bosses: raid.bosses || null,
    channelId: raid.channelId || null,
    messageId: raid.messageId || null,
    presetId: raid.presetId || null,
    detailUrl: `/raids/${raid.id}`,
  };
};

/**
 * Wandelt eine Liste von Raids um.
 */
exports.toRaidListResponse = (list = []) => {
  return list.map((r) => exports.toRaidResponse(r));
};
