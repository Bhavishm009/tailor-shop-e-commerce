import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

export type GuestPushRow = {
  id: string
  visitor_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: Date
  updated_at: Date
}

async function ensureGuestPushTable() {
  await db.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS guest_push_subscriptions (
      id TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
      visitor_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT guest_push_subscriptions_pkey PRIMARY KEY (id)
    )
  `)
  await db.$executeRaw(Prisma.sql`
    CREATE UNIQUE INDEX IF NOT EXISTS guest_push_subscriptions_endpoint_key
    ON guest_push_subscriptions(endpoint)
  `)
  await db.$executeRaw(Prisma.sql`
    CREATE INDEX IF NOT EXISTS guest_push_subscriptions_visitor_id_idx
    ON guest_push_subscriptions(visitor_id)
  `)
}

export async function upsertGuestPushSubscription(input: {
  visitorId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string | null
}) {
  await ensureGuestPushTable()

  await db.$executeRaw(Prisma.sql`
    INSERT INTO guest_push_subscriptions (
      visitor_id,
      endpoint,
      p256dh,
      auth,
      user_agent
    )
    VALUES (
      ${input.visitorId},
      ${input.endpoint},
      ${input.p256dh},
      ${input.auth},
      ${input.userAgent || null}
    )
    ON CONFLICT (endpoint) DO UPDATE SET
      visitor_id = EXCLUDED.visitor_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      updated_at = NOW()
  `)
}

export async function listGuestPushSubscriptions() {
  await ensureGuestPushTable()

  return db.$queryRaw<GuestPushRow[]>(Prisma.sql`
    SELECT *
    FROM guest_push_subscriptions
    ORDER BY created_at DESC
  `)
}

export async function deleteGuestSubscriptionsByEndpoints(endpoints: string[]) {
  await ensureGuestPushTable()
  if (endpoints.length === 0) return
  await db.$executeRaw(Prisma.sql`
    DELETE FROM guest_push_subscriptions
    WHERE endpoint IN (${Prisma.join(endpoints)})
  `)
}

export async function deleteGuestSubscriptionsByVisitorDevice(input: {
  visitorId: string
  userAgent: string | null
  keepEndpoint: string
}) {
  await ensureGuestPushTable()
  if (!input.userAgent) return
  await db.$executeRaw(Prisma.sql`
    DELETE FROM guest_push_subscriptions
    WHERE visitor_id = ${input.visitorId}
      AND user_agent = ${input.userAgent}
      AND endpoint <> ${input.keepEndpoint}
  `)
}
