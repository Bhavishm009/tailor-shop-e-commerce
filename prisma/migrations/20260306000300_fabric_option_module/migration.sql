CREATE TABLE IF NOT EXISTS "FabricOption" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "clothType" "ClothType" NOT NULL,
  "buyRatePerMeter" DOUBLE PRECISION NOT NULL,
  "sellRatePerMeter" DOUBLE PRECISION NOT NULL,
  "image" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FabricOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FabricOption_clothType_isActive_idx" ON "FabricOption"("clothType", "isActive");
