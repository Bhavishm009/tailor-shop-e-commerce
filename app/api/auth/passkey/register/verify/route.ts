import { NextResponse } from "next/server"
import { verifyRegistrationResponse } from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"
import type { RegistrationResponseJSON } from "@simplewebauthn/types"
import { requireAuth } from "@/lib/api-auth"
import { consumePasskeyChallenge } from "@/lib/passkey-challenge-store"
import { getExpectedOrigins, getRpId } from "@/lib/passkey-config"
import { insertPasskeyCredential } from "@/lib/passkey-db"

export async function POST(request: Request) {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const body = (await request.json()) as {
      challengeId?: string
      response?: RegistrationResponseJSON
    }

    if (!body.challengeId || !body.response) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const challenge = consumePasskeyChallenge(body.challengeId, "register")
    if (!challenge || challenge.userId !== session.user.id) {
      return NextResponse.json({ error: "Passkey challenge expired. Please retry." }, { status: 400 })
    }

    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: false,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Failed to verify passkey registration" }, { status: 400 })
    }

    const registrationInfo = verification.registrationInfo
    await insertPasskeyCredential({
      userId: session.user.id,
      credentialId: isoBase64URL.fromBuffer(registrationInfo.credentialID),
      publicKey: isoBase64URL.fromBuffer(registrationInfo.credentialPublicKey),
      counter: registrationInfo.counter,
      transports: body.response.response.transports || null,
      deviceType: registrationInfo.credentialDeviceType || null,
      backedUp: registrationInfo.credentialBackedUp || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[passkey/register/verify]", error)
    return NextResponse.json({ error: "Failed to register passkey" }, { status: 500 })
  }
}
