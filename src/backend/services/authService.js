// src/backend/services/authService.js
// Discord OAuth + Gilden-Rollen + Owner-Erkennung + Debug-Logging

const fetch = global.fetch || require("node-fetch");
const users = require("../models/userModel.js");

const DISCORD_API = "https://discord.com/api";

// ---------- ENV ----------
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

const BACKEND_URL =
  process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
const FRONTEND_URL = process.env.FRONTEND_URL || BACKEND_URL;

// Redirect-URI: akzeptiere beide ENV-Namen
const REDIRECT_URI =
  process.env.OAUTH_REDIRECT_URI ||
  process.env.DISCORD_REDIRECT_URI ||
  `${BACKEND_URL}/api/auth/callback`;

// Bot/Guild: akzeptiere alte und neue ENV-Namen
const BOT_TOKEN =
  process.env.DISCORD_BOT_TOKEN ||
  process.env.BOT_TOKEN ||
  process.env.DISCORD_TOKEN;

const GUILD_ID =
  process.env.DISCORD_GUILD_ID ||
  process.env.GUILD_ID;

// Rollen: akzeptiere mehrere Alias-Namen
const ROLE_ADMIN =
  process.env.ADMIN_ROLE_ID || process.env.DISCORD_ROLE_ADMIN_ID || null;

const ROLE_LEAD =
  process.env.RAIDLEAD_ROLE_ID || process.env.DISCORD_ROLE_LEAD_ID || null;

const ROLE_BOOSTER =
  process.env.BOOSTER_ROLE_ID || process.env.DISCORD_ROLE_BOOSTER_ID || null;

const ROLE_LOOTBUDDY =
  process.env.LOOTBUDDY_ROLE_ID ||
  process.env.DISCORD_ROLE_LOOTBUDDY_ID ||
  process.env.DISCORD_ROLE_LOOTBUDDYS_ID ||
  null;

// Owner-ID kann aus ENV kommen; sonst holen wir sie von Discord
const GUILD_OWNER_ID_ENV =
  process.env.DISCORD_GUILD_OWNER_ID || process.env.GUILD_OWNER_ID || null;

// Debug-Schalter
const DEBUG = !!process.env.DEBUG_AUTH;

// Initiale ENV-Zusammenfassung (ohne Secrets)
if (DEBUG) {
  try {
    console.log(
      "[AUTH][ENV] summary:",
      JSON.stringify(
        {
          BACKEND_URL,
          FRONTEND_URL,
          REDIRECT_URI,
          CLIENT_ID_SET: !!CLIENT_ID,
          CLIENT_SECRET_SET: !!CLIENT_SECRET,
          BOT_TOKEN_SET: !!BOT_TOKEN,
          GUILD_ID,
          ROLE_ADMIN,
          ROLE_LEAD,
          ROLE_BOOSTER,
          ROLE_LOOTBUDDY,
          GUILD_OWNER_ID_ENV: GUILD_OWNER_ID_ENV ? "(set)" : null,
        },
        null,
        2
      )
    );
  } catch {}
}

// ---------- Helpers ----------
function toStr(x) {
  return x == null ? "" : String(x);
}

function params(q) {
  const s = new URLSearchParams();
  Object.entries(q || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) s.append(k, String(v));
  });
  return s.toString();
}

// ---------- OAuth: Schritt 1 – Authorize URL ----------
function getAuthorizeUrl(state = "") {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds",
    prompt: "consent",
    state,
  });
  return `${DISCORD_API}/oauth2/authorize?${p.toString()}`;
}

// ---------- OAuth: Schritt 2 – Code gegen Token tauschen ----------
async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (DEBUG) {
    console.log("[AUTH] exchangeCodeForToken status:", res.status);
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`token_exchange_failed: ${res.status} ${t}`);
  }
  return res.json();
}

// ---------- Discord-APIs ----------
async function fetchDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (DEBUG) console.log("[AUTH] /users/@me status:", res.status);
  if (!res.ok) throw new Error(`me_fetch_failed: ${res.status}`);
  return res.json();
}

async function fetchGuildMember(discordUserId) {
  if (!BOT_TOKEN || !GUILD_ID) {
    if (DEBUG) console.warn("[AUTH] missing BOT_TOKEN/GUILD_ID");
    return null;
  }
  const url = `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordUserId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (DEBUG) console.log("[AUTH] fetchGuildMember", { status: res.status, url });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`guild_member_failed: ${res.status}`);
  return res.json();
}

async function fetchGuildOwnerId() {
  if (GUILD_OWNER_ID_ENV) return toStr(GUILD_OWNER_ID_ENV);
  if (!BOT_TOKEN || !GUILD_ID) return null;
  const url = `${DISCORD_API}/guilds/${GUILD_ID}`;
  const res = await fetch(url, { headers: { Authorization: `Bot ${BOT_TOKEN}` } });
  if (DEBUG) console.log("[AUTH] fetchGuildOwnerId", { status: res.status, url });
  if (!res.ok) return null;
  const g = await res.json();
  return g?.owner_id ? toStr(g.owner_id) : null;
}

// ---------- Rollen → Flags ----------
function computeRoleFlags(member) {
  const rolesRaw = Array.isArray(member?.roles) ? member.roles : [];
  const roles = rolesRaw.map((r) => toStr(r));

  if (DEBUG) {
    console.log("[AUTH] member.roles:", roles);
    console.log("[AUTH] expected role IDs:", {
      admin: ROLE_ADMIN,
      lead: ROLE_LEAD,
      booster: ROLE_BOOSTER,
      lootbuddy: ROLE_LOOTBUDDY,
    });
  }

  const has = (rid) => !!rid && roles.includes(toStr(rid));

  const isAdmin = has(ROLE_ADMIN);
  const isRaidlead = has(ROLE_LEAD) || isAdmin;
  const isBooster = has(ROLE_BOOSTER) || isRaidlead;
  const isLootbuddy = has(ROLE_LOOTBUDDY);

  let highestRole = "viewer";
  if (isAdmin) highestRole = "admin";
  else if (isRaidlead) highestRole = "raidlead";
  else if (isBooster) highestRole = "booster";
  else if (isLootbuddy) highestRole = "lootbuddy";

  // Rolle zu Level: viewer(0) < booster(1) < raidlead/admin(2) < owner(3)
  let roleLevel = 0;
  if (isBooster) roleLevel = 1;
  if (isRaidlead || isAdmin) roleLevel = Math.max(roleLevel, 2);

  return {
    isAdmin,
    isRaidlead,
    isBooster,
    isLootbuddy,
    highestRole,
    roleLevel,
    rolesCsv: roles.join(","),
  };
}

// ---------- Login (Callback) ----------
async function loginWithCode(code) {
  const token = await exchangeCodeForToken(code);
  const me = await fetchDiscordUser(token.access_token);

  // Gilden-Member & Rollen
  const member = await fetchGuildMember(me.id);
  const baseFlags = computeRoleFlags(member);

  // Owner?
  const ownerId = await fetchGuildOwnerId();
  const isOwner = !!ownerId && toStr(me.id) === toStr(ownerId);

  const flags = {
    ...baseFlags,
    isOwner,
    roleLevel: isOwner ? 3 : baseFlags.roleLevel,
  };

  // In DB ablegen/aktualisieren
  const saved = await users.upsertFromDiscord({
    discordId: me.id,
    username: me.username || null,
    displayName: me.global_name || me.username || null,
    avatarUrl: me.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png`
      : null,
    rolesCsv: flags.rolesCsv,
    highestRole: flags.highestRole,
    roleLevel: flags.roleLevel,
    isOwner: flags.isOwner,
    isAdmin: flags.isAdmin,
    isRaidlead: flags.isRaidlead,
  });

  if (DEBUG) {
    console.log("[AUTH] loginWithCode → flags:", flags);
    console.log("[AUTH] loginWithCode → saved user:", {
      discordId: toStr(me.id),
      displayName: saved?.displayName || null,
      username: saved?.username || null,
      roleLevel: flags.roleLevel,
      isOwner: flags.isOwner,
      isAdmin: flags.isAdmin,
      isRaidlead: flags.isRaidlead,
    });
  }

  return {
    user: {
      id: saved?.id || null,
      discordId: toStr(me.id),
      username: saved?.username || me.username || null,
      displayName: saved?.displayName || me.global_name || me.username || null,
      avatarUrl:
        saved?.avatarUrl ||
        (me.avatar
          ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png`
          : null),
      isOwner: !!flags.isOwner,
      isAdmin: !!flags.isAdmin,
      isRaidlead: !!flags.isRaidlead,
      roleLevel: flags.roleLevel,
      highestRole: flags.highestRole,
    },
    token, // access_token, refresh_token, expires_in, ...
  };
}

// ---------- Session-Refresh (/users/me) ----------
async function ensureFreshSession(currentSessionUser) {
  try {
    const discordId =
      currentSessionUser?.discordId || currentSessionUser?.id || null;
    if (!discordId) return currentSessionUser;

    const member = await fetchGuildMember(discordId);
    const baseFlags = computeRoleFlags(member);

    const ownerId = await fetchGuildOwnerId();
    const isOwner = !!ownerId && toStr(discordId) === toStr(ownerId);
    const flags = {
      ...baseFlags,
      isOwner,
      roleLevel: isOwner ? 3 : baseFlags.roleLevel,
    };

    // DB aktualisieren (nur Meta/Flags)
    const dbUser = await users.findByDiscordId(discordId);
    await users.upsertFromDiscord({
      discordId: toStr(discordId),
      username: dbUser?.username || currentSessionUser?.username || null,
      displayName: dbUser?.displayName || currentSessionUser?.displayName || null,
      avatarUrl: dbUser?.avatarUrl || currentSessionUser?.avatarUrl || null,
      rolesCsv: flags.rolesCsv,
      highestRole: flags.highestRole,
      roleLevel: flags.roleLevel,
      isOwner: flags.isOwner,
      isAdmin: flags.isAdmin,
      isRaidlead: flags.isRaidlead,
    });

    const refreshed = {
      id: dbUser?.id || currentSessionUser?.id || null,
      discordId: toStr(discordId),
      username: dbUser?.username || currentSessionUser?.username || null,
      displayName: dbUser?.displayName || currentSessionUser?.displayName || null,
      avatarUrl: dbUser?.avatarUrl || currentSessionUser?.avatarUrl || null,
      isOwner: !!flags.isOwner,
      isAdmin: !!flags.isAdmin,
      isRaidlead: !!flags.isRaidlead,
      roleLevel: flags.roleLevel,
      highestRole: flags.highestRole,
    };

    if (DEBUG) {
      console.log("[AUTH] ensureFreshSession →", refreshed);
    }

    return refreshed;
  } catch (e) {
    if (DEBUG) console.warn("[AUTH] refresh roles failed:", e?.message || e);
    return currentSessionUser;
  }
}

module.exports = {
  getAuthorizeUrl,
  loginWithCode,
  ensureFreshSession,
  FRONTEND_URL,
};
