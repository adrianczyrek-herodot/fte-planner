-- Warstwa kosztowa: stawki GODZINOWE z datą obowiązywania + koszty dodatkowe
-- projektu. Kolumna User.monthlyRate znika — była martwa (nigdy nieużywana w
-- interfejsie) i opierała się na porzuconym pomyśle stawki miesięcznej.
-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('tools', 'hardware', 'software', 'other');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "monthlyRate";

-- CreateTable
CREATE TABLE "EmployeeRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "validFrom" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionRate" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "validFrom" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCostItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL DEFAULT 'other',
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeRate_userId_idx" ON "EmployeeRate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeRate_userId_validFrom_key" ON "EmployeeRate"("userId", "validFrom");

-- CreateIndex
CREATE INDEX "PositionRate_positionId_idx" ON "PositionRate"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "PositionRate_positionId_validFrom_key" ON "PositionRate"("positionId", "validFrom");

-- CreateIndex
CREATE INDEX "ProjectCostItem_projectId_idx" ON "ProjectCostItem"("projectId");

-- AddForeignKey
ALTER TABLE "EmployeeRate" ADD CONSTRAINT "EmployeeRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionRate" ADD CONSTRAINT "PositionRate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCostItem" ADD CONSTRAINT "ProjectCostItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

