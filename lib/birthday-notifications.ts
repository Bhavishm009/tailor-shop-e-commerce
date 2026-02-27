import { db } from "@/lib/db"
import { createNotification } from "@/lib/notifications"
import { sendBirthdayWishEmail } from "@/lib/email"

let lastRunDateKey = ""

function getTodayKey(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export async function runBirthdayNotificationsIfDue() {
  const todayKey = getTodayKey()
  if (lastRunDateKey === todayKey) return { ran: false, reason: "already-ran-in-process" as const }

  const now = new Date()
  const month = now.getUTCMonth() + 1
  const day = now.getUTCDate()
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

  const birthdayUsers = await db.user.findMany({
    where: {
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      dateOfBirth: true,
      notifyEmail: true,
      notifyPush: true,
    },
  })

  const matched = birthdayUsers.filter((user) => {
    if (!user.dateOfBirth) return false
    return user.dateOfBirth.getUTCMonth() + 1 === month && user.dateOfBirth.getUTCDate() === day
  })

  let notified = 0
  for (const user of matched) {
    const existing = await db.notification.findFirst({
      where: {
        userId: user.id,
        type: "BIRTHDAY",
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { id: true },
    })
    if (existing) continue

    if (user.notifyPush) {
      await createNotification({
        userId: user.id,
        title: "Happy Birthday!",
        message: `Happy Birthday ${user.name}! Have an amazing day from TailorHub.`,
        type: "BIRTHDAY",
        link: "/",
      })
    } else {
      await db.notification.create({
        data: {
          userId: user.id,
          title: "Happy Birthday!",
          message: `Happy Birthday ${user.name}! Have an amazing day from TailorHub.`,
          type: "BIRTHDAY",
          link: "/",
        },
      })
    }

    if (user.notifyEmail) {
      await sendBirthdayWishEmail(user.email, user.name)
    }
    notified += 1
  }

  lastRunDateKey = todayKey
  return { ran: true, notified }
}

