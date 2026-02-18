import { db } from "@/lib/db"

type NotificationInput = {
  userId: string
  title: string
  message: string
  type: string
  link?: string
}

export async function createNotification(input: NotificationInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link,
    },
  })
}

export async function createOrderNotification(input: NotificationInput) {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { notifyOrders: true },
  })

  if (!user?.notifyOrders) return null

  return createNotification(input)
}

