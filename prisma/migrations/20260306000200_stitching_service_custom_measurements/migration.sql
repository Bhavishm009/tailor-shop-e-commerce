ALTER TABLE "StitchingService"
ADD COLUMN IF NOT EXISTS "measurementFields" JSONB,
ADD COLUMN IF NOT EXISTS "measurementGuideImage" TEXT;
