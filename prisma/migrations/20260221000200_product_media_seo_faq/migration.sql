ALTER TABLE "Product"
ADD COLUMN "slug" TEXT,
ADD COLUMN "images" JSONB,
ADD COLUMN "videos" JSONB,
ADD COLUMN "subcategory" TEXT,
ADD COLUMN "clothType" TEXT,
ADD COLUMN "colors" JSONB,
ADD COLUMN "tags" JSONB,
ADD COLUMN "highlights" JSONB,
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoKeywords" TEXT,
ADD COLUMN "canonicalUrl" TEXT;

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_clothType_idx" ON "Product"("clothType");
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

CREATE TABLE "Faq" (
  "id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Faq_isActive_idx" ON "Faq"("isActive");
CREATE INDEX "Faq_category_idx" ON "Faq"("category");

CREATE TABLE "ProductFaq" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "faqId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductFaq_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductFaq_productId_faqId_key" ON "ProductFaq"("productId", "faqId");
CREATE INDEX "ProductFaq_productId_order_idx" ON "ProductFaq"("productId", "order");
CREATE INDEX "ProductFaq_faqId_idx" ON "ProductFaq"("faqId");

ALTER TABLE "ProductFaq"
ADD CONSTRAINT "ProductFaq_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductFaq"
ADD CONSTRAINT "ProductFaq_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "Faq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
