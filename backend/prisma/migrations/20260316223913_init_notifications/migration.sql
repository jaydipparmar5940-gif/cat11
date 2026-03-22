-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Contest_matchId_idx" ON "Contest"("matchId");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_idx" ON "ContestEntry"("contestId");

-- CreateIndex
CREATE INDEX "ContestEntry_userId_idx" ON "ContestEntry"("userId");

-- CreateIndex
CREATE INDEX "ContestEntry_userTeamId_idx" ON "ContestEntry"("userTeamId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_matchStartTime_idx" ON "Match"("matchStartTime");

-- CreateIndex
CREATE INDEX "MatchSquad_matchId_idx" ON "MatchSquad"("matchId");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE INDEX "PlayerPoint_matchId_idx" ON "PlayerPoint"("matchId");

-- CreateIndex
CREATE INDEX "PlayerPoint_playerId_idx" ON "PlayerPoint"("playerId");

-- CreateIndex
CREATE INDEX "PlayerPoints_playerId_idx" ON "PlayerPoints"("playerId");

-- CreateIndex
CREATE INDEX "PlayerPoints_matchId_idx" ON "PlayerPoints"("matchId");

-- CreateIndex
CREATE INDEX "TeamPlayer_userTeamId_idx" ON "TeamPlayer"("userTeamId");

-- CreateIndex
CREATE INDEX "TeamPlayer_playerId_idx" ON "TeamPlayer"("playerId");

-- CreateIndex
CREATE INDEX "Transaction_walletId_idx" ON "Transaction"("walletId");

-- CreateIndex
CREATE INDEX "UserTeam_userId_idx" ON "UserTeam"("userId");

-- CreateIndex
CREATE INDEX "UserTeam_matchId_idx" ON "UserTeam"("matchId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
