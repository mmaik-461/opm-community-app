-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "FeedbackReason" AS ENUM ('GREAT_MATCH', 'DIFFERENT_INDUSTRY', 'SKILL_MISMATCH', 'OTHER');

-- CreateTable
CREATE TABLE "MatchFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "reason" "FeedbackReason",
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchFeedback_createdAt_idx" ON "MatchFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "MatchFeedback_userId_idx" ON "MatchFeedback"("userId");

-- CreateIndex
CREATE INDEX "MatchFeedback_candidateId_idx" ON "MatchFeedback"("candidateId");

-- AddForeignKey
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
