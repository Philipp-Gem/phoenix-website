// scripts/dedupe-before-unique.js
// Bereinigt Duplikate vor dem Hinzufügen der Unique-Constraints:
// 1) BoosterChar: (userId, name, realm) -> nur 1x
//    - Gewinner = kleinste id
//    - Signups der Verlierer auf Gewinner umhängen
//    - Verlierer löschen
// 2) Signup: (raidId, charId) -> nur 1x
//    - Gewinner = kleinste id
//    - Duplikate löschen

const { prisma } = require("../src/backend/prismaClient.js");

async function dedupeBoosterChars() {
  const all = await prisma.boosterChar.findMany({
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      userId: true,
      name: true,
      realm: true,
    },
  });

  const groups = new Map(); // key = `${userId}::${name}::${realm}` -> ids[]
  for (const c of all) {
    const key = `${c.userId}::${c.name}::${c.realm}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  let movedSignups = 0;
  let deletedChars = 0;

  for (const [key, list] of groups.entries()) {
    if (list.length <= 1) continue;

    // Gewinner = mit kleinster id
    const sorted = list.slice().sort((a, b) => a.id - b.id);
    const winner = sorted[0];
    const losers = sorted.slice(1);

    for (const loser of losers) {
      // Signups umhängen: loser.id -> winner.id
      const updated = await prisma.signup.updateMany({
        where: { charId: loser.id },
        data: { charId: winner.id },
      });
      movedSignups += updated.count;

      // Verlierer löschen
      await prisma.boosterChar.delete({ where: { id: loser.id } });
      deletedChars++;
      console.log(`[dedupe] BoosterChar loser removed id=${loser.id} -> winner id=${winner.id} (key=${key})`);
    }
  }

  console.log(`[dedupe] BoosterChar done. signups moved=${movedSignups}, chars deleted=${deletedChars}`);
}

async function dedupeSignups() {
  const all = await prisma.signup.findMany({
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      raidId: true,
      charId: true,
    },
  });

  // Gruppen nur für Datensätze mit gesetzter charId
  const groups = new Map(); // key = `${raidId}::${charId}` -> ids[]
  for (const s of all) {
    if (s.charId == null) continue; // nur Duplikate mit gesetzter charId sind relevant
    const key = `${s.raidId}::${s.charId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  let deleted = 0;

  for (const [key, list] of groups.entries()) {
    if (list.length <= 1) continue;

    const sorted = list.slice().sort((a, b) => a.id - b.id);
    const winner = sorted[0];
    const losers = sorted.slice(1);

    for (const loser of losers) {
      await prisma.signup.delete({ where: { id: loser.id } });
      deleted++;
      console.log(`[dedupe] Signup duplicate removed id=${loser.id} (kept id=${winner.id}, key=${key})`);
    }
  }

  console.log(`[dedupe] Signup done. duplicates deleted=${deleted}`);
}

async function main() {
  await dedupeBoosterChars();
  await dedupeSignups();
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
