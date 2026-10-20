-- CreateEnum
CREATE TYPE "IntroStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "IntroRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "icebreaker" TEXT NOT NULL,
    "status" "IntroStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntroRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntroRequest_requesterId_idx" ON "IntroRequest"("requesterId");

-- CreateIndex
CREATE INDEX "IntroRequest_targetId_status_idx" ON "IntroRequest"("targetId", "status");

-- AddForeignKey
ALTER TABLE "IntroRequest" ADD CONSTRAINT "IntroRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntroRequest" ADD CONSTRAINT "IntroRequest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
