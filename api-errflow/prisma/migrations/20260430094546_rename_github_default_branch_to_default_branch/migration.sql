/*
  Warnings:

  - You are about to drop the column `githubDefaultBranch` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "githubDefaultBranch",
ADD COLUMN     "defaultBranch" TEXT NOT NULL DEFAULT 'main';
