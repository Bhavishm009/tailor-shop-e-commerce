import { randomInt } from "crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_ATTEMPTS = 5

type MemoryOtpEntry = {
  code: string
  expiresAt: number
  attemptsLeft: number
}

const memoryOtpStore = new Map<string, MemoryOtpEntry>()

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function ensureOtpTable() {
  await db.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS login_otps (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts_left INTEGER NOT NULL DEFAULT 5,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migrate legacy column type safely in existing environments where expires_at was TIMESTAMP.
  await db.$executeRaw(Prisma.sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'login_otps'
          AND column_name = 'expires_at'
          AND data_type = 'timestamp without time zone'
      ) THEN
        ALTER TABLE login_otps
        ALTER COLUMN expires_at TYPE TIMESTAMPTZ
        USING expires_at AT TIME ZONE 'UTC';
      END IF;
    END $$;
  `)
}

async function cleanupExpiredOtps() {
  await db.$executeRaw(Prisma.sql`
    DELETE FROM login_otps
    WHERE expires_at <= NOW()
  `)
}

function cleanupMemoryOtps() {
  const now = Date.now()
  for (const [email, entry] of memoryOtpStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryOtpStore.delete(email)
    }
  }
}

type OtpRow = {
  email: string
  code: string
  expires_at: Date
  attempts_left: number
}

export async function issueLoginOtp(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const code = String(randomInt(0, 1000000)).padStart(6, "0")
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)

  memoryOtpStore.set(normalizedEmail, {
    code,
    expiresAt: expiresAt.getTime(),
    attemptsLeft: OTP_ATTEMPTS,
  })

  try {
    await ensureOtpTable()
    await cleanupExpiredOtps()

    await db.$executeRaw(Prisma.sql`
      INSERT INTO login_otps (email, code, expires_at, attempts_left)
      VALUES (${normalizedEmail}, ${code}, ${expiresAt}, ${OTP_ATTEMPTS})
      ON CONFLICT (email) DO UPDATE SET
        code = EXCLUDED.code,
        expires_at = EXCLUDED.expires_at,
        attempts_left = EXCLUDED.attempts_left,
        updated_at = NOW()
    `)
  } catch (error) {
    console.error("[otp/issue/db]", error)
  }

  return {
    code,
    expiresAt,
  }
}

export async function verifyAndConsumeLoginOtp(email: string, otp: string) {
  const normalizedEmail = normalizeEmail(email)
  cleanupMemoryOtps()
  const trimmedOtp = otp.trim()

  try {
    await ensureOtpTable()
    await cleanupExpiredOtps()
    const rows = await db.$queryRaw<OtpRow[]>(Prisma.sql`
      SELECT email, code, expires_at, attempts_left
      FROM login_otps
      WHERE email = ${normalizedEmail}
      LIMIT 1
    `)
    const entry = rows[0]

    if (entry) {
      if (entry.expires_at.getTime() <= Date.now()) {
        await db.$executeRaw(Prisma.sql`
          DELETE FROM login_otps WHERE email = ${normalizedEmail}
        `)
      } else if (entry.code === trimmedOtp) {
        await db.$executeRaw(Prisma.sql`
          DELETE FROM login_otps WHERE email = ${normalizedEmail}
        `)
        memoryOtpStore.delete(normalizedEmail)
        return true
      } else {
        const remaining = entry.attempts_left - 1
        if (remaining <= 0) {
          await db.$executeRaw(Prisma.sql`
            DELETE FROM login_otps WHERE email = ${normalizedEmail}
          `)
        } else {
          await db.$executeRaw(Prisma.sql`
            UPDATE login_otps
            SET attempts_left = ${remaining}, updated_at = NOW()
            WHERE email = ${normalizedEmail}
          `)
        }
      }
    }
  } catch (error) {
    console.error("[otp/verify/db]", error)
  }

  const memoryEntry = memoryOtpStore.get(normalizedEmail)
  if (!memoryEntry) return false

  if (memoryEntry.expiresAt <= Date.now()) {
    memoryOtpStore.delete(normalizedEmail)
    return false
  }

  if (memoryEntry.code !== trimmedOtp) {
    const remaining = memoryEntry.attemptsLeft - 1
    if (remaining <= 0) {
      memoryOtpStore.delete(normalizedEmail)
    } else {
      memoryOtpStore.set(normalizedEmail, {
        ...memoryEntry,
        attemptsLeft: remaining,
      })
    }
    return false
  }

  memoryOtpStore.delete(normalizedEmail)
  return true
}
