-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOffers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyOrders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPush" BOOLEAN NOT NULL DEFAULT false;
