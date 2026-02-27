ALTER TABLE "Measurement"
ADD COLUMN IF NOT EXISTS "measurementType" TEXT,
ADD COLUMN IF NOT EXISTS "measurementData" JSONB;
