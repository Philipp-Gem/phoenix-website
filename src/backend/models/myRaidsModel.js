// src/backend/models/myRaidsModel.js
/**
 * Repository/Model für "meine Raids"
 * - Liest Signups eines Users (Discord-ID) inkl. verknüpftem Raid (und optional Char)
 * - Nur DB-Zugriffe, keine Business-Logik
 *
 * Nutzt Prisma-Modelle:
 *  - Signup (userId -> User.discordId, raidId -> Raid.id, charId -> BoosterChar.id)
 *  - Raid
 *  - BoosterChar
 */

const { prisma } = require("../prismaClient.js");

/* -------------------------------- Mapper -------------------------------- */

function mapRaid(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    difficulty: r.difficulty,
    lootType: r.lootType,
    date: r.date,
    lead: r.lead || null,
    bosses: r.bosses,

    tanks: r.tanks,
    healers: r.healers,
    dps: r.dps,
    lootbuddies: r.lootbuddies,

    channelId: r.channelId || null,
    messageId: r.messageId || null,

    presetId: r.presetId ?? null,

    // Optional: gezählte Signups, wenn via include angefragt (als _count.signups)
    _counts: r._count ? { signups: r._count.signups } : undefined,
  };
}

function mapChar(c) {
  if (!c) return null;
  return {
    id: c.id,
    userId: c.userId,
    name: c.name,
    realm: c.realm,
    class: c.class || null,
    spec: c.spec || null,
    itemLevel: c.itemLevel == null ? null : Number(c.itemLevel),
  };
}

function mapSignup(s) {
  if (!s) return null;
  return {
    id: s.id,
    raidId: s.raidId,
    userId: s.userId || null,
    type: s.type || "DPS",
    charId: s.charId ?? null,
    displayName: s.displayName || null,
    saved: !!s.saved,
    note: s.note || null,
    class: s.class || null,
    status: s.status || "SIGNUPED",
    createdAt: s.createdAt,
  };
}

/* ------------------------------- Queries -------------------------------- */

/**
 * Alle Signups eines Users (Discord-ID), inkl. Raid (und optional Char).
 * Standard-Sortierung: nach Raid-Datum (aufsteigend), dann Signup.createdAt.
 */
async function listByUser(discordUserId, {
  from,        // optional: Date/ISO → nur Raids ab diesem Datum
  to,          // optional: Date/ISO → nur Raids bis zu diesem Datum
  includeChar = true,
  includeCounts = true, // _count.signups am Raid
  order = "raidDate:asc", // "raidDate:asc|desc" oder "createdAt:asc|desc"
  take,
  skip,
} = {}) {
  const dateFilter = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) dateFilter.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) dateFilter.lte = d;
  }

  // Wir filtern in der Query auf userId; das Datum filtern wir auf der Raid-Ebene.
  // Prisma: Filter über relation fields via where: { raid: { date: {...} } }
  const where = {
    userId: String(discordUserId),
    ...(Object.keys(dateFilter).length ? { raid: { date: dateFilter } } : {}),
  };

  // Sortierung
  let orderBy;
  if (order && String(order).startsWith("raidDate:")) {
    const dir = String(order).split(":")[1] === "desc" ? "desc" : "asc";
    orderBy = [{ raid: { date: dir } }, { createdAt: "asc" }];
  } else if (order && String(order).startsWith("createdAt:")) {
    const dir = String(order).split(":")[1] === "desc" ? "desc" : "asc";
    orderBy = [{ createdAt: dir }];
  } else {
    orderBy = [{ raid: { date: "asc" } }, { createdAt: "asc" }];
  }

  const rows = await prisma.signup.findMany({
    where,
    orderBy,
    include: {
      raid: {
        include: includeCounts ? { _count: { select: { signups: true } } } : undefined,
      },
      char: includeChar
        ? {
            select: {
              id: true, userId: true, name: true, realm: true, class: true, spec: true, itemLevel: true,
            },
          }
        : false,
    },
    take: take || undefined,
    skip: skip || undefined,
  });

  // Rückgabe als flache Strukturen pro Eintrag: { raid, signup, char? }
  return rows.map((row) => ({
    raid: mapRaid(row.raid),
    signup: mapSignup(row),
    char: includeChar ? mapChar(row.char) : undefined,
  }));
}

/**
 * Nur kommende Raids eines Users (ab jetzt).
 * Convenience-Wrapper um listByUser(...)
 */
async function listUpcomingByUser(discordUserId, {
  from = new Date(),
  limit = 25,
  includeChar = true,
  includeCounts = true,
} = {}) {
  const items = await listByUser(discordUserId, {
    from,
    includeChar,
    includeCounts,
    order: "raidDate:asc",
    take: limit,
  });
  return items;
}

module.exports = {
  listByUser,
  listUpcomingByUser,
};
