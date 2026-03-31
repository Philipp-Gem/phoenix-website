// src/backend/services/usersService.js
// Thin Service-Layer für User

const users = require("../models/userModel.js");

async function getLeads() {
  return users.findLeads();
}
async function upsertFromDiscord(payload) {
  return users.upsertFromDiscord(payload);
}
async function findByDiscordId(discordId) {
  return users.findByDiscordId(discordId);
}

// ✨ NEU: Liste inkl. Chars & Raid-Historie
async function listWithDetails(q) {
  return users.findManyWithDetails({ q, limit: 500, historyTake: 20 });
}

module.exports = {
  getLeads,
  upsertFromDiscord,
  findByDiscordId,
  listWithDetails,
};
