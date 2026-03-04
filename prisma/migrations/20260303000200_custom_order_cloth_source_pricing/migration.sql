-- CreateEnum
CREATE TYPE "ClothSource" AS ENUM ('OWN', 'FROM_US');

-- AlterTable
ALTER TABLE "StitchingOrder"
ADD COLUMN "clothSource" "ClothSource" NOT NULL DEFAULT 'OWN',
ADD COLUMN "clothName" TEXT,
ADD COLUMN "clothPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "stitchingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill stitching price from existing total price.
UPDATE "StitchingOrder" SET "stitchingPrice" = "price" WHERE "stitchingPrice" = 0;

