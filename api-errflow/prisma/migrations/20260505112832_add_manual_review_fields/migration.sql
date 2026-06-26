-- AlterEnum
ALTER TYPE "FixStatus" ADD VALUE 'NEEDS_MANUAL_REVIEW';

-- AlterTable
ALTER TABLE "FixAttempt" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "requiresManualReview" BOOLEAN NOT NULL DEFAULT false;
