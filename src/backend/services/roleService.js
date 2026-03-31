// src/backend/services/roleService.js
/**
 * RoleService
 * - Enthält reine Fachlogik zum Ableiten der internen Rollenflags
 *   (isOwner, isAdmin, isRaidlead, highestRole, roleLevel, rolesCsv)
 *   aus Discord-Guild-Daten.
 *
 * Erwartete ENV (alle optional, aber empfohlen):
 *   DISCORD_ROLE_OWNER_ID   = "..."   // falls Owner via spezielle Rolle markiert wird
 *   DISCORD_ROLE_ADMIN_ID   = "..."   // Admin-Rolle
 *   DISCORD_ROLE_LEAD_ID    = "..."   // Raidlead-Rolle
 *   DISCORD_GUILD_OWNER_ID  = "..."   // statischer Owner-Fallback (sonst via /guilds geholt)
 */

const CFG = {
  roleOwner: process.env.DISCORD_ROLE_OWNER_ID || null,
  roleAdmin: process.env.DISCORD_ROLE_ADMIN_ID || null,
  roleLead: process.env.DISCORD_ROLE_LEAD_ID || null,
  guildOwnerId: process.env.DISCORD_GUILD_OWNER_ID || null,
};

/** Hilfsfunktion: numerische Level-Ermittlung aus Flags */
function computeLevel({ isOwner, isAdmin, isRaidlead }) {
  if (isOwner) return 3;
  if (isAdmin) return 2;
  if (isRaidlead) return 1;
  return 0;
}

/** Klein-Utility für saubere CSV-Erzeugung */
function toCsv(arr) {
  return arr.filter(Boolean).join(",");
}

/**
 * mapMemberToFlags
 *  - Leitet interne Flags aus einem Discord-Guild-Member ab.
 * @param {Object} params
 * @param {string} params.userId                     - Discord User ID (Snowflake)
 * @param {Object|null} params.member                - Ergebnis von /guilds/:id/members/:userId  (kann null sein)
 * @param {string|null} [params.guildOwnerId]        - (optional) Owner-ID, falls bereits bekannt (sonst ENV genutzt)
 * @returns {{ isOwner:boolean, isAdmin:boolean, isRaidlead:boolean, highestRole:'owner'|'admin'|'raidlead'|null, roleLevel:number, rolesCsv:string|null }}
 */
function mapMemberToFlags({ userId, member, guildOwnerId }) {
  const roles = Array.isArray(member?.roles) ? member.roles.map(String) : [];
  const ownerId = String(guildOwnerId || CFG.guildOwnerId || "");

  const isOwnerById = ownerId && String(userId) === ownerId;
  const hasOwnerRole = CFG.roleOwner ? roles.includes(String(CFG.roleOwner)) : false;
  const isAdmin = CFG.roleAdmin ? roles.includes(String(CFG.roleAdmin)) : false;
  const isRaidlead = CFG.roleLead ? roles.includes(String(CFG.roleLead)) : false;

  const isOwner = !!(isOwnerById || hasOwnerRole);

  // highestRole + roleLevel
  let highestRole = null;
  if (isRaidlead) highestRole = "raidlead";
  if (isAdmin) highestRole = "admin";
  if (isOwner) highestRole = "owner";

  const roleLevel = computeLevel({ isOwner, isAdmin, isRaidlead });

  const rolesCsv = toCsv([
    isOwner ? "owner" : null,
    isAdmin ? "admin" : null,
    isRaidlead ? "raidlead" : null,
  ]) || null;

  return { isOwner, isAdmin, isRaidlead, highestRole, roleLevel, rolesCsv };
}

/**
 * mergeRoleMeta
 *  - Merged bestehende Benutzerflags/-csv mit neu abgeleiteten Flags (z. B. aus Discord).
 *  - Nimmt stets die "stärkeren" Rechte (owner > admin > raidlead).
 */
function mergeRoleMeta(existing = {}, incoming = {}) {
  const e = {
    isOwner: !!existing.isOwner,
    isAdmin: !!existing.isAdmin,
    isRaidlead: !!existing.isRaidlead,
  };
  const i = {
    isOwner: !!incoming.isOwner,
    isAdmin: !!incoming.isAdmin,
    isRaidlead: !!incoming.isRaidlead,
  };

  const merged = {
    isOwner: e.isOwner || i.isOwner,
    isAdmin: e.isAdmin || i.isAdmin,
    isRaidlead: e.isRaidlead || i.isRaidlead,
  };

  let highestRole = null;
  if (merged.isRaidlead) highestRole = "raidlead";
  if (merged.isAdmin) highestRole = "admin";
  if (merged.isOwner) highestRole = "owner";

  const roleLevel = computeLevel(merged);

  // CSV zusammenführen, doppelte vermeiden
  const set = new Set([
    ...(existing.rolesCsv ? String(existing.rolesCsv).split(",").map(s => s.trim()).filter(Boolean) : []),
    ...(incoming.rolesCsv ? String(incoming.rolesCsv).split(",").map(s => s.trim()).filter(Boolean) : []),
    merged.isOwner ? "owner" : null,
    merged.isAdmin ? "admin" : null,
    merged.isRaidlead ? "raidlead" : null,
  ].filter(Boolean));

  const rolesCsv = set.size ? Array.from(set).join(",") : null;

  return { ...merged, highestRole, roleLevel, rolesCsv };
}

module.exports = {
  CFG,
  mapMemberToFlags,
  mergeRoleMeta,
  computeLevel,
};
