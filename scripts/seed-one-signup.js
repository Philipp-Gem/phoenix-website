// scripts/seed-one-signup.js
// Legt für einen bestehenden Raid (RAID_ID) einen User, Char und Signup an.

const { prisma } = require("../src/backend/prismaClient.js");

async function main() {
  const RAID_ID = Number(process.env.RAID_ID || 1); // <-- ggf. anpassen/übergeben
  const DISCORD_ID = process.env.DISCORD_ID || "1228761152239046769"; // Dummy
  const DISPLAY = process.env.DISPLAY || "Syntax";
  const CHAR_NAME = process.env.CHAR_NAME || "Synblast";
  const CHAR_REALM = process.env.CHAR_REALM || "Blackhand";
  const ROLE = (process.env.ROLE || "HEAL").toUpperCase(); // TANK|HEAL|DPS|LOOTBUDDY

  // 1) Raid prüfen
  const raid = await prisma.raid.findUnique({ where: { id: RAID_ID } });
  if (!raid) {
    console.error(`[seed] Raid ${RAID_ID} nicht gefunden. Bitte zuerst Raid anlegen.`);
    process.exit(1);
  }

  // 2) User upsert
  const user = await prisma.user.upsert({
    where: { discordId: DISCORD_ID },
    update: { displayName: DISPLAY },
    create: {
      discordId: DISCORD_ID,
      username: DISPLAY,
      displayName: DISPLAY,
      isRaidlead: false,
      isAdmin: false,
      isOwner: false,
    },
  });

  // 3) Char upsert
  const char = await prisma.boosterChar.upsert({
    where: {
      // Für upsert per unique brauchst du normal ein Unique-Feld.
      // Falls du keins hast: wir emulieren über findFirst + create/update.
      // Hier ein simpler Workaround:
      id: -1, // invalid, wird unten überschrieben
    },
    update: {},
    create: {
      userId: user.discordId,
      name: CHAR_NAME,
      realm: CHAR_REALM,
      class: "Shaman",
      spec: "Resto",
      itemLevel: 486,
      rioScore: 3000,
      wclUrl: "https://www.warcraftlogs.com/character/eu/blackhand/synblast",
    },
  }).catch(async () => {
    // Fallback: wenn upsert scheitert, suche & erstelle manuell
    const existing = await prisma.boosterChar.findFirst({
      where: { userId: user.discordId, name: CHAR_NAME, realm: CHAR_REALM },
    });
    if (existing) return existing;
    return prisma.boosterChar.create({
      data: {
        userId: user.discordId,
        name: CHAR_NAME,
        realm: CHAR_REALM,
        class: "Shaman",
        spec: "Resto",
        itemLevel: 486,
        rioScore: 3000,
        wclUrl: "https://www.warcraftlogs.com/character/eu/blackhand/synblast",
      },
    });
  });

  // 4) Signup erstellen
  const signup = await prisma.signup.create({
    data: {
      raidId: RAID_ID,
      userId: user.discordId,
      type: ROLE,              // "HEAL" | "TANK" | "DPS" | "LOOTBUDDY"
      charId: char.id,
      displayName: user.displayName,
      saved: false,
      note: null,
      class: char.class,
      status: "SIGNUPED",
    },
    include: { char: true, user: true },
  });

  console.log("[seed] OK", { raidId: RAID_ID, signupId: signup.id });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
