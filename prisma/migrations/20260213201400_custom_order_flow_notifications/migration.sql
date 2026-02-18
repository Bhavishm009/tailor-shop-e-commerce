-- CreateEnum
CREATE TYPE "TailorPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "payoutAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "payoutRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "payoutStatus" "TailorPayoutStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "StitchingOrder" ADD COLUMN     "serviceKey" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Assignment_payoutStatus_idx" ON "Assignment"("payoutStatus");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
