-- CreateTable
CREATE TABLE "StitchingService" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerPrice" DOUBLE PRECISION NOT NULL,
    "tailorRate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StitchingService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StitchingService_key_key" ON "StitchingService"("key");

-- CreateIndex
CREATE INDEX "StitchingService_category_idx" ON "StitchingService"("category");

-- CreateIndex
CREATE INDEX "StitchingService_isActive_idx" ON "StitchingService"("isActive");
