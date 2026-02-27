import { hash, compare } from "bcrypt-ts"
import { randomBytes } from "crypto"

export async function hashPassword(password: string) {
  return hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return compare(password, hashedPassword)
}

export async function generateSystemPasswordHash() {
  const systemPassword = randomBytes(24).toString("hex")
  return hashPassword(systemPassword)
}
