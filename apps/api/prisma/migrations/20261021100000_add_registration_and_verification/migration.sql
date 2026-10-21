-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION');

-- AlterTable
-- Rows that exist before registration are the seeded alumni: they are already verified (ACTIVE),
-- and their graduation year is backfilled (the seed script writes the real values).
ALTER TABLE "Profile" ADD COLUMN     "diplomaNumber" TEXT,
ADD COLUMN     "graduationYear" INTEGER NOT NULL DEFAULT 2020,
ADD COLUMN     "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE';

-- New registrations are unverified until an alumnus is verified.
ALTER TABLE "Profile" ALTER COLUMN "graduationYear" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_VERIFICATION';
