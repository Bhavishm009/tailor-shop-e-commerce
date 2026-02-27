import { createHmac, timingSafeEqual } from "crypto"

type PasskeyFlow = "register" | "authenticate"

type ChallengeRecord = {
  flow: PasskeyFlow
  challenge: string
  userId?: string
  expiresAt: number
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000

function toBase64Url(input: string | Buffer) {
  const raw = Buffer.isBuffer(input) ? input.toString("base64") : Buffer.from(input, "utf8").toString("base64")
  return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized + "===".slice((normalized.length + 3) % 4)
  return Buffer.from(padded, "base64")
}

function getSigningSecret() {
  return process.env.PASSKEY_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "tailorhub-dev-passkey-secret"
}

function sign(data: string) {
  return toBase64Url(createHmac("sha256", getSigningSecret()).update(data).digest())
}

export function issuePasskeyChallenge(input: { flow: PasskeyFlow; challenge: string; userId?: string }) {
  const payload = {
    flow: input.flow,
    challenge: input.challenge,
    userId: input.userId,
    exp: Date.now() + CHALLENGE_TTL_MS,
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function consumePasskeyChallenge(challengeId: string, flow: PasskeyFlow): ChallengeRecord | null {
  const [encodedPayload, providedSignature] = challengeId.split(".")
  if (!encodedPayload || !providedSignature) return null

  const expectedSignature = sign(encodedPayload)
  const provided = Buffer.from(providedSignature, "utf8")
  const expected = Buffer.from(expectedSignature, "utf8")

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const decoded = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as {
      flow?: string
      challenge?: string
      userId?: string
      exp?: number
    }

    if (!decoded.flow || !decoded.challenge || !decoded.exp) return null
    if (decoded.flow !== flow) return null
    if (decoded.exp <= Date.now()) return null

    return {
      flow: decoded.flow as PasskeyFlow,
      challenge: decoded.challenge,
      userId: decoded.userId,
      expiresAt: decoded.exp,
    }
  } catch {
    return null
  }
}
