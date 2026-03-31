// scripts/debug-list-signups.js
const { prisma } = require("../src/backend/prismaClient.js");

(async () => {
  const raidId = Number(process.env.RAID_ID || 2);
  const rows = await prisma.signup.findMany({
    where: { raidId },
    include: { char: true, user: true },
    orderBy: { id: "asc" },
  });
  console.log(`[debug] signups for raid ${raidId}:`);
  console.table(
    rows.map(r => ({
      id: r.id,
      raidId: r.raidId,
      status: r.status,
      type: r.type,
      displayName: r.displayName,
      charId: r.charId,
      charName: r.char?.name || null,
    }))
  );
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
