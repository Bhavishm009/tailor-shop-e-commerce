CREATE TABLE IF NOT EXISTS "guest_push_subscriptions" (
  "id" TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
  "visitor_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "guest_push_subscriptions_endpoint_key" ON "guest_push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "guest_push_subscriptions_visitor_id_idx" ON "guest_push_subscriptions"("visitor_id");

