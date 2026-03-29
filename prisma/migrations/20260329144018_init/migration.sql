-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "discordAvatar" TEXT,
    "discordGlobalName" TEXT,
    "discordEmail" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "fullName" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "apiKey" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'other',
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "banReason" TEXT,
    "bannedAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_discordId_key" ON "users"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiKey_key" ON "users"("apiKey");
