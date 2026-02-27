import webpush from "web-push"

type PushPayload = {
  title: string
  body: string
  url?: string
}

let configured = false

function ensureConfigured() {
  if (configured) return
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  const email = process.env.WEB_PUSH_SUBJECT || "mailto:no-reply@example.com"
  if (!publicKey || !privateKey) return
  webpush.setVapidDetails(email, publicKey, privateKey)
  configured = true
}

export function isWebPushConfigured() {
  return Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY)
}

export async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  ensureConfigured()
  if (!isWebPushConfigured()) {
    return { success: false, removeSubscription: false }
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    )
    return { success: true, removeSubscription: false }
  } catch (error) {
    console.error("[push/send]", error)
    const statusCode = typeof error === "object" && error !== null ? (error as { statusCode?: number }).statusCode : undefined
    return {
      success: false,
      removeSubscription: statusCode === 404 || statusCode === 410,
    }
  }
}
