-- CreateEnum
CREATE TYPE "SuggestionCategory" AS ENUM ('FEATURE', 'IMPROVEMENT', 'BUG', 'OTHER');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('NEW', 'PLANNED', 'DONE', 'DECLINED');

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "SuggestionCategory" NOT NULL DEFAULT 'IMPROVEMENT',
    "status" "SuggestionStatus" NOT NULL DEFAULT 'NEW',
    "submittedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

