import { NextResponse } from "next/server"
import { generateRegistrationOptions } from "@simplewebauthn/server"
import { isoBase64URL } from "@simplewebauthn/server/helpers"
import { requireAuth } from "@/lib/api-auth"
import { getRpId, getRpName } from "@/lib/passkey-config"
import { issuePasskeyChallenge } from "@/lib/passkey-challenge-store"
import { listUserPasskeys } from "@/lib/passkey-db"

export async function POST() {
  try {
    const { session, response } = await requireAuth()
    if (response || !session) return response

    const passkeys = await listUserPasskeys(session.user.id)
    const options = await generateRegistrationOptions({
      rpID: getRpId(),
      rpName: getRpName(),
      userID: session.user.id,
      userName: session.user.email || `${session.user.id}@tailorhub.local`,
      userDisplayName: session.user.name || "TailorHub User",
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: passkeys.map((item) => ({
        id: isoBase64URL.toBuffer(item.credential_id),
        type: "public-key",
        transports: (item.transports as any) || undefined,
      })),
    })

    const challengeId = issuePasskeyChallenge({
      flow: "register",
      challenge: options.challenge,
      userId: session.user.id,
    })

    return NextResponse.json({
      challengeId,
      options,
    })
  } catch (error) {
    console.error("[passkey/register/options]", error)
    return NextResponse.json({ error: "Failed to prepare passkey registration" }, { status: 500 })
  }
}
