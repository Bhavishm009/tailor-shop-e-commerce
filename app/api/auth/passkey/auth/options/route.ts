import { NextResponse } from "next/server"
import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { getRpId } from "@/lib/passkey-config"
import { issuePasskeyChallenge } from "@/lib/passkey-challenge-store"

export async function POST() {
  try {
    const options = await generateAuthenticationOptions({
      rpID: getRpId(),
      userVerification: "preferred",
      allowCredentials: [],
    })

    const challengeId = issuePasskeyChallenge({
      flow: "authenticate",
      challenge: options.challenge,
    })

    return NextResponse.json({
      challengeId,
      options,
    })
  } catch (error) {
    console.error("[passkey/auth/options]", error)
    return NextResponse.json({ error: "Failed to start passkey login" }, { status: 500 })
  }
}

