/*
  Warnings:

  - You are about to drop the column `month` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Assignment` table. All the data in the column will be lost.
  - Added the required column `endMonth` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectRoleId` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startMonth` to the `Assignment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_projectId_fkey";

-- DropIndex
DROP INDEX "Assignment_projectId_idx";

-- DropIndex
DROP INDEX "Assignment_userId_month_idx";

-- DropIndex
DROP INDEX "Assignment_userId_projectId_month_key";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "month",
DROP COLUMN "projectId",
ADD COLUMN     "endMonth" VARCHAR(7) NOT NULL,
ADD COLUMN     "projectRoleId" TEXT NOT NULL,
ADD COLUMN     "startMonth" VARCHAR(7) NOT NULL;

-- CreateTable
CREATE TABLE "ProjectRole" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startMonth" VARCHAR(7) NOT NULL,
    "endMonth" VARCHAR(7) NOT NULL,
    "requiredFte" DECIMAL(4,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRole_projectId_idx" ON "ProjectRole"("projectId");

-- CreateIndex
CREATE INDEX "Assignment_userId_idx" ON "Assignment"("userId");

-- CreateIndex
CREATE INDEX "Assignment_projectRoleId_idx" ON "Assignment"("projectRoleId");

-- AddForeignKey
ALTER TABLE "ProjectRole" ADD CONSTRAINT "ProjectRole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_projectRoleId_fkey" FOREIGN KEY ("projectRoleId") REFERENCES "ProjectRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
