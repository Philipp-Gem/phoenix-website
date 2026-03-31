// src/backend/routes/debugRoutes.js
/**
 * Debug-Routen für Rollen-Erkennung
 * GET /api/debug/roles  → zeigt Session-User, Member-Rollen & abgeleitete Flags
 *
 * Hinweis: Nur für lokale Diagnose gedacht – später entfernen oder absichern!
 */

const express = require("express");
const { attachUser, requireAuth } = require("../middlewares/auth.js");
const Discord = require("../services/discordService.js");
const Roles = require("../services/roleService.js");

const router = express.Router();

// Session-User anhängen
router.use(attachUser);

// GET /api/debug/roles
router.get("/debug/roles", requireAuth, async (req, res) => {
  try {
    const discordId = String(req.user.discordId);
    let guildOwnerId = Roles.CFG.guildOwnerId || null;
    let member = null;
    const notes = [];

    if (!Discord.CFG.guildId) notes.push("DISCORD_GUILD_ID fehlt");
    if (!Discord.CFG.botToken) notes.push("DISCORD_BOT_TOKEN fehlt (Member/Rollen nicht abrufbar)");

    // Owner-ID ggf. über /guilds ermitteln
    if (!guildOwnerId && Discord.CFG.guildId && Discord.CFG.botToken) {
      const guild = await Discord.fetchGuild().catch(() => null);
      if (guild?.owner_id) guildOwnerId = String(guild.owner_id);
      else notes.push("Konnte guild.owner_id nicht bestimmen");
    }

    // Memberdaten (Rollen) laden
    if (Discord.CFG.guildId && Discord.CFG.botToken) {
      member = await Discord.fetchGuildMember(discordId).catch(() => null);
      if (!member) notes.push("Member nicht gefunden (nicht auf dem Server?)");
    }

    // Flags ableiten
    const derived = Roles.mapMemberToFlags({
      userId: discordId,
      member,
      guildOwnerId,
    });

    return res.json({
      ok: true,
      guildId: Discord.CFG.guildId || null,
      rolesConfig: {
        roleOwner: Roles.CFG.roleOwner || null,
        roleAdmin: Roles.CFG.roleAdmin || null,
        roleLead: Roles.CFG.roleLead || null,
        guildOwnerId: guildOwnerId || null,
      },
      sessionUser: req.user,
      member: member
        ? { user: member.user || null, roles: member.roles || [], nick: member.nick || null }
        : null,
      derived,
      note: notes.length ? notes.join("; ") : "OK",
    });
  } catch (e) {
    console.error("[GET /debug/roles] error:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// ⚠️ WICHTIG: exakt dieses Export-Format erwartet dein server.js-Autoloader
module.exports = {
  basePath: "/debug",
  router,
};
