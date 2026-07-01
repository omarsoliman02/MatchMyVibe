-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "movieGenres" TEXT[] DEFAULT ARRAY[]::TEXT[];
