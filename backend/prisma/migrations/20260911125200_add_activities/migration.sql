-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MEETING', 'CALL', 'EMAIL', 'NOTE', 'TASK', 'OTHER');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'NOTE',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL,
    "followUpAt" TIMESTAMP(3),
    "followUpNote" TEXT,
    "followUpDone" BOOLEAN NOT NULL DEFAULT false,
    "followUpDoneAt" TIMESTAMP(3),
    "leadId" TEXT,
    "clientId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_followUpAt_idx" ON "Activity"("followUpAt");

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- CreateIndex
CREATE INDEX "Activity_clientId_idx" ON "Activity"("clientId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "KeyClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

