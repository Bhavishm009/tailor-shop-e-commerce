import { NextResponse } from "next/server"
import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"
import type { AuthenticationResponseJSON } from "@simplewebauthn/types"
import { db } from "@/lib/db"
import { consumePasskeyChallenge } from "@/lib/passkey-challenge-store"
import { getExpectedOrigins, getRpId } from "@/lib/passkey-config"
import { findPasskeyByCredentialId, updatePasskeyCounter } from "@/lib/passkey-db"
import { issuePasskeyLoginToken } from "@/lib/passkey-login-store"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      challengeId?: string
      response?: AuthenticationResponseJSON
    }

    if (!body.challengeId || !body.response) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const challenge = consumePasskeyChallenge(body.challengeId, "authenticate")
    if (!challenge) {
      return NextResponse.json({ error: "Passkey challenge expired. Please retry." }, { status: 400 })
    }

    const credentialId = body.response.id
    const passkey = await findPasskeyByCredentialId(credentialId)
    if (!passkey) {
      return NextResponse.json({ error: "Passkey not recognized for any account" }, { status: 404 })
    }

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      authenticator: {
        credentialID: isoBase64URL.toBuffer(passkey.credential_id),
        credentialPublicKey: isoBase64URL.toBuffer(passkey.public_key),
        counter: Number(passkey.counter),
        transports: (passkey.transports as any) || undefined,
      },
      requireUserVerification: false,
    })

    if (!verification.verified) {
      return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 })
    }

    if (verification.authenticationInfo) {
      await updatePasskeyCounter(passkey.credential_id, verification.authenticationInfo.newCounter)
    }

    const user = await db.user.findUnique({
      where: { id: passkey.user_id },
      select: {
        id: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Linked user not found" }, { status: 404 })
    }

    const loginToken = issuePasskeyLoginToken({
      userId: user.id,
      email: user.email,
    })

    return NextResponse.json({
      loginToken,
      email: user.email,
    })
  } catch (error) {
    console.error("[passkey/auth/verify]", error)
    return NextResponse.json({ error: "Failed to verify passkey login" }, { status: 500 })
  }
}
