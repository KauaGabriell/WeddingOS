-- CreateCompanion
CREATE TABLE "Companion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rsvpResponseId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Companion_pkey" PRIMARY KEY ("id")
);

-- AddCompanionRsvpResponseIdFkey
CREATE INDEX "Companion_rsvpResponseId_idx" ON "Companion"("rsvpResponseId");

ALTER TABLE "Companion" ADD CONSTRAINT "Companion_rsvpResponseId_fkey"
    FOREIGN KEY ("rsvpResponseId") REFERENCES "RsvpResponse"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
