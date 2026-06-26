-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubAccessTokenEncrypted" TEXT,
ADD COLUMN     "githubAccessTokenIv" TEXT,
ADD COLUMN     "githubAccessTokenKeyVersion" INTEGER,
ADD COLUMN     "githubId" TEXT,
ADD COLUMN     "githubTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "githubUsername" TEXT;
