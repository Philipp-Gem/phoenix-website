// src/backend/services/myRaidsService.js
const { prisma } = require("../prismaClient.js");

function mapRaid(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    difficulty: r.difficulty,
    lootType: r.lootType,
    date: r.date,
    lead: r.lead,
    bosses: r.bosses,
    channelId: r.channelId ?? null,
    messageId: r.messageId ?? null,
    presetId: r.presetId ?? null,
  };
}

function mapEntry(row) {
  return {
    raid: mapRaid(row.raid),
    signup: {
      id: row.id,
      raidId: row.raidId,
      userId: row.userId ?? row.user?.discordId ?? null,
      status: row.status,     // z.B. "PICKED", "SIGNUPED"
      type: row.type,         // "TANK" | "HEAL" | "DPS" | "LOOTBUDDY"
      saved: !!row.saved,
      note: row.note ?? null,
      displayName: row.displayName ?? row.user?.displayName ?? row.user?.username ?? null,
      class: row.class ?? row.char?.class ?? null,
      createdAt: row.createdAt,
    },
    char: row.char
      ? {
          id: row.char.id,
          name: row.char.name,
          realm: row.char.realm,
          class: row.char.class ?? null,
          spec: row.char.spec ?? null,
          itemLevel: row.char.itemLevel ?? null,
          rioScore: row.char.rioScore ?? null,
          wclUrl: row.char.wclUrl ?? null,
        }
      : null,
  };
}

exports.getForUser = async (discordId) => {
  const now = new Date();
  const id = String(discordId);

  // robust: match entweder signup.userId oder verknüpfter user.discordId
  const rows = await prisma.signup.findMany({
    where: {
      OR: [{ userId: id }, { user: { discordId: id } }],
    },
    include: {
      raid: true,
      char: true,
      user: { select: { discordId: true, displayName: true, username: true } },
    },
    orderBy: [{ raid: { date: "asc" } }, { id: "asc" }],
  });

  const upcoming = { rostered: [], signups: [] };
  const past = { rostered: [], signups: [] };

  for (const row of rows) {
    if (!row.raid || !row.raid.date) continue;
    const entry = mapEntry(row);
    const target = row.raid.date > now ? upcoming : past;
    if (row.status === "PICKED") target.rostered.push(entry);
    else target.signups.push(entry);
  }

  const byDateAsc = (a, b) => new Date(a.raid.date) - new Date(b.raid.date);
  const byDateDesc = (a, b) => new Date(b.raid.date) - new Date(a.raid.date);

  upcoming.rostered.sort(byDateAsc);
  upcoming.signups.sort(byDateAsc);
  past.rostered.sort(byDateDesc);
  past.signups.sort(byDateDesc);

  return { upcoming, past };
};
