import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

export type PasskeyCredentialRow = {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  counter: bigint
  transports: string[] | null
  device_type: string | null
  backed_up: boolean | null
  created_at: Date
  updated_at: Date
  last_used_at: Date | null
}

export async function listUserPasskeys(userId: string) {
  return db.$queryRaw<PasskeyCredentialRow[]>(Prisma.sql`
    SELECT *
    FROM passkey_credentials
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `)
}

export async function findPasskeyByCredentialId(credentialId: string) {
  const rows = await db.$queryRaw<PasskeyCredentialRow[]>(Prisma.sql`
    SELECT *
    FROM passkey_credentials
    WHERE credential_id = ${credentialId}
    LIMIT 1
  `)
  return rows[0] || null
}

export async function insertPasskeyCredential(input: {
  userId: string
  credentialId: string
  publicKey: string
  counter: number
  transports: string[] | null
  deviceType: string | null
  backedUp: boolean | null
}) {
  if (input.transports && input.transports.length > 0) {
    await db.$executeRaw(Prisma.sql`
      INSERT INTO passkey_credentials (
        user_id,
        credential_id,
        public_key,
        counter,
        transports,
        device_type,
        backed_up
      )
      VALUES (
        ${input.userId},
        ${input.credentialId},
        ${input.publicKey},
        ${BigInt(input.counter)},
        ${input.transports},
        ${input.deviceType},
        ${input.backedUp}
      )
      ON CONFLICT (credential_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        public_key = EXCLUDED.public_key,
        counter = EXCLUDED.counter,
        transports = EXCLUDED.transports,
        device_type = EXCLUDED.device_type,
        backed_up = EXCLUDED.backed_up,
        updated_at = NOW()
    `)
    return
  }

  await db.$executeRaw(Prisma.sql`
    INSERT INTO passkey_credentials (
      user_id,
      credential_id,
      public_key,
      counter,
      transports,
      device_type,
      backed_up
    )
    VALUES (
      ${input.userId},
      ${input.credentialId},
      ${input.publicKey},
      ${BigInt(input.counter)},
      NULL,
      ${input.deviceType},
      ${input.backedUp}
    )
    ON CONFLICT (credential_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      public_key = EXCLUDED.public_key,
      counter = EXCLUDED.counter,
      transports = EXCLUDED.transports,
      device_type = EXCLUDED.device_type,
      backed_up = EXCLUDED.backed_up,
      updated_at = NOW()
  `)
}

export async function updatePasskeyCounter(credentialId: string, counter: number) {
  await db.$executeRaw(Prisma.sql`
    UPDATE passkey_credentials
    SET counter = ${BigInt(counter)}, last_used_at = NOW(), updated_at = NOW()
    WHERE credential_id = ${credentialId}
  `)
}

export async function deletePasskeyCredential(id: string, userId: string) {
  const deleted = await db.$executeRaw(Prisma.sql`
    DELETE FROM passkey_credentials
    WHERE id = ${id} AND user_id = ${userId}
  `)
  return Number(deleted) > 0
}
