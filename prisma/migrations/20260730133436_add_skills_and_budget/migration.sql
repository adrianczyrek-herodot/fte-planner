-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budget" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
