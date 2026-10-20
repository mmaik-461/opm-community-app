-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "TravelStatus" AS ENUM ('LIVING_IN', 'TRAVELING_TO');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "travelStatus" "TravelStatus" NOT NULL DEFAULT 'LIVING_IN',
    "cohort" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "skills" TEXT[],
    "avatarUrl" TEXT,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Profile_city_idx" ON "Profile"("city");
