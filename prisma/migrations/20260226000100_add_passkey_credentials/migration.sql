CREATE TABLE IF NOT EXISTS "passkey_credentials" (
  "id" TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
  "user_id" TEXT NOT NULL,
  "credential_id" TEXT NOT NULL,
  "public_key" TEXT NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "transports" TEXT[],
  "device_type" TEXT,
  "backed_up" BOOLEAN,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3),
  CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "passkey_credentials_credential_id_key" ON "passkey_credentials"("credential_id");
CREATE INDEX IF NOT EXISTS "passkey_credentials_user_id_idx" ON "passkey_credentials"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'passkey_credentials_user_id_fkey'
  ) THEN
    ALTER TABLE "passkey_credentials"
    ADD CONSTRAINT "passkey_credentials_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
