/*
  Warnings:

  - You are about to drop the column `testCode` on the `FixAttempt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FixAttempt" DROP COLUMN "testCode",
ADD COLUMN     "changedLines" INTEGER;
