CREATE TYPE "ProductMasterType" AS ENUM ('CATEGORY', 'SUBCATEGORY', 'CLOTH_TYPE', 'MATERIAL', 'SIZE', 'COLOR');

ALTER TABLE "Product"
ADD COLUMN "categoryId" TEXT,
ADD COLUMN "subcategoryId" TEXT,
ADD COLUMN "clothTypeId" TEXT,
ADD COLUMN "materialId" TEXT;

CREATE TABLE "ProductMaster" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "ProductMasterType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductMaster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductMasterSelection" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "masterId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductMasterSelection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductMaster_type_slug_key" ON "ProductMaster"("type", "slug");
CREATE INDEX "ProductMaster_type_isActive_idx" ON "ProductMaster"("type", "isActive");
CREATE INDEX "ProductMaster_parentId_idx" ON "ProductMaster"("parentId");

CREATE UNIQUE INDEX "ProductMasterSelection_productId_masterId_key" ON "ProductMasterSelection"("productId", "masterId");
CREATE INDEX "ProductMasterSelection_masterId_idx" ON "ProductMasterSelection"("masterId");
CREATE INDEX "ProductMasterSelection_productId_idx" ON "ProductMasterSelection"("productId");

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_subcategoryId_idx" ON "Product"("subcategoryId");
CREATE INDEX "Product_clothTypeId_idx" ON "Product"("clothTypeId");
CREATE INDEX "Product_materialId_idx" ON "Product"("materialId");

ALTER TABLE "ProductMaster"
ADD CONSTRAINT "ProductMaster_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductMasterSelection"
ADD CONSTRAINT "ProductMasterSelection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductMasterSelection"
ADD CONSTRAINT "ProductMasterSelection_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "ProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_clothTypeId_fkey" FOREIGN KEY ("clothTypeId") REFERENCES "ProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
