-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "coverImageBlurDataUrl" TEXT,
ADD COLUMN     "ogDescription" TEXT,
ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "ogImageBlurDataUrl" TEXT,
ADD COLUMN     "ogTitle" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoKeywords" TEXT,
ADD COLUMN     "seoTitle" TEXT;
