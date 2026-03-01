-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'COMPLAINT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "OrderConversation" (
    "id" TEXT NOT NULL,
    "stitchingOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tailorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "stitchingOrderId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnComplaint" (
    "id" TEXT NOT NULL,
    "stitchingOrderId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderConversation_stitchingOrderId_key" ON "OrderConversation"("stitchingOrderId");

-- CreateIndex
CREATE INDEX "OrderConversation_customerId_idx" ON "OrderConversation"("customerId");

-- CreateIndex
CREATE INDEX "OrderConversation_tailorId_idx" ON "OrderConversation"("tailorId");

-- CreateIndex
CREATE INDEX "OrderMessage_conversationId_createdAt_idx" ON "OrderMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderMessage_stitchingOrderId_createdAt_idx" ON "OrderMessage"("stitchingOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderMessage_senderId_createdAt_idx" ON "OrderMessage"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnComplaint_messageId_key" ON "ReturnComplaint"("messageId");

-- CreateIndex
CREATE INDEX "ReturnComplaint_stitchingOrderId_createdAt_idx" ON "ReturnComplaint"("stitchingOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnComplaint_status_createdAt_idx" ON "ReturnComplaint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnComplaint_raisedById_createdAt_idx" ON "ReturnComplaint"("raisedById", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderConversation" ADD CONSTRAINT "OrderConversation_stitchingOrderId_fkey" FOREIGN KEY ("stitchingOrderId") REFERENCES "StitchingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConversation" ADD CONSTRAINT "OrderConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConversation" ADD CONSTRAINT "OrderConversation_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "OrderConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_stitchingOrderId_fkey" FOREIGN KEY ("stitchingOrderId") REFERENCES "StitchingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnComplaint" ADD CONSTRAINT "ReturnComplaint_stitchingOrderId_fkey" FOREIGN KEY ("stitchingOrderId") REFERENCES "StitchingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnComplaint" ADD CONSTRAINT "ReturnComplaint_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnComplaint" ADD CONSTRAINT "ReturnComplaint_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "OrderMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnComplaint" ADD CONSTRAINT "ReturnComplaint_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

