-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "discordId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "rolesCsv" TEXT,
    "isRaidlead" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "highestRole" TEXT,
    "roleLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Raid" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "lootType" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "lead" TEXT,
    "bosses" INTEGER NOT NULL,
    "tanks" INTEGER NOT NULL DEFAULT 0,
    "healers" INTEGER NOT NULL DEFAULT 0,
    "dps" INTEGER NOT NULL DEFAULT 0,
    "lootbuddies" INTEGER NOT NULL DEFAULT 0,
    "channelId" TEXT,
    "messageId" TEXT,
    "presetId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Raid_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "Preset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tanks" INTEGER NOT NULL DEFAULT 0,
    "healers" INTEGER NOT NULL DEFAULT 0,
    "dps" INTEGER NOT NULL DEFAULT 0,
    "lootbuddies" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "BoosterChar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "class" TEXT,
    "spec" TEXT,
    "rioScore" REAL,
    "progress" TEXT,
    "itemLevel" INTEGER,
    "wclUrl" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BoosterChar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raidId" INTEGER NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DPS',
    "charId" INTEGER,
    "displayName" TEXT,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "class" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SIGNUPED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signup_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signup_charId_fkey" FOREIGN KEY ("charId") REFERENCES "BoosterChar" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Signup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Strike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Strike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SignupEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raidId" INTEGER,
    "userId" TEXT NOT NULL,
    "charId" INTEGER,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignupEvent_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SignupEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SignupEvent_charId_fkey" FOREIGN KEY ("charId") REFERENCES "BoosterChar" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE INDEX "Raid_date_idx" ON "Raid"("date");

-- CreateIndex
CREATE INDEX "BoosterChar_userId_idx" ON "BoosterChar"("userId");

-- CreateIndex
CREATE INDEX "BoosterChar_name_idx" ON "BoosterChar"("name");

-- CreateIndex
CREATE INDEX "BoosterChar_realm_idx" ON "BoosterChar"("realm");

-- CreateIndex
CREATE UNIQUE INDEX "BoosterChar_userId_name_realm_key" ON "BoosterChar"("userId", "name", "realm");

-- CreateIndex
CREATE INDEX "Signup_raidId_idx" ON "Signup"("raidId");

-- CreateIndex
CREATE INDEX "Signup_userId_idx" ON "Signup"("userId");

-- CreateIndex
CREATE INDEX "Signup_charId_idx" ON "Signup"("charId");

-- CreateIndex
CREATE UNIQUE INDEX "Signup_raidId_charId_key" ON "Signup"("raidId", "charId");

-- CreateIndex
CREATE INDEX "Strike_userId_idx" ON "Strike"("userId");

-- CreateIndex
CREATE INDEX "Strike_expiresAt_idx" ON "Strike"("expiresAt");

-- CreateIndex
CREATE INDEX "SignupEvent_raidId_idx" ON "SignupEvent"("raidId");

-- CreateIndex
CREATE INDEX "SignupEvent_userId_idx" ON "SignupEvent"("userId");

-- CreateIndex
CREATE INDEX "SignupEvent_type_idx" ON "SignupEvent"("type");

-- CreateIndex
CREATE INDEX "SignupEvent_createdAt_idx" ON "SignupEvent"("createdAt");
