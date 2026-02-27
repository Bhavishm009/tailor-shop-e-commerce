import { db } from "@/lib/db"
import { sendWebPushNotification } from "@/lib/push"
import { emitToUser } from "@/lib/realtime-server"

type NotificationInput = {
  userId: string
  title: string
  message: string
  type: string
  link?: string
}

export async function createNotification(input: NotificationInput) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link,
    },
  })

  const [user, subscriptions] = await Promise.all([
    db.user.findUnique({
      where: { id: input.userId },
      select: { notifyPush: true },
    }),
    db.pushSubscription.findMany({
      where: { userId: input.userId },
      select: { endpoint: true, p256dh: true, auth: true },
    }),
  ])

  if (user?.notifyPush && subscriptions.length > 0) {
    const pushResults = await Promise.all(
      subscriptions.map(async (subscription) => ({
        endpoint: subscription.endpoint,
        result: await sendWebPushNotification(subscription, {
          title: input.title,
          body: input.message,
          url: input.link || "/",
        }),
      })),
    )

    const staleEndpoints = pushResults.filter((item) => item.result.removeSubscription).map((item) => item.endpoint)
    if (staleEndpoints.length > 0) {
      await db.pushSubscription.deleteMany({
        where: {
          endpoint: {
            in: staleEndpoints,
          },
        },
      })
    }
  }

  emitToUser(input.userId, "notification:new", {
    notification,
  })

  return notification
}

export async function createOrderNotification(input: NotificationInput) {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { notifyOrders: true },
  })

  if (!user?.notifyOrders) return null

  return createNotification(input)
}
