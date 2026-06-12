-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "password" TEXT,
  ADD COLUMN "totpSecret" TEXT,
  ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'MEMBER';
