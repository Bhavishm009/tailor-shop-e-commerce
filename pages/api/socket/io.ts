import type { NextApiRequest } from "next"
import type { NextApiResponseServerIO } from "@/types/socket"
import { Server as IOServer } from "socket.io"
import { setIoServer } from "@/lib/realtime-server"

export default function handler(_req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: "/api/socket/io",
      addTrailingSlash: false,
    })

    io.on("connection", (socket) => {
      socket.on("user:join", ({ userId }: { userId?: string }) => {
        if (!userId) return
        socket.join(`user:${userId}`)
      })

      socket.on("commerce:cart-updated", ({ userId, cart }: { userId?: string; cart?: unknown }) => {
        if (!userId) return
        socket.to(`user:${userId}`).emit("commerce:cart-updated", { cart })
      })

      socket.on("commerce:wishlist-updated", ({ userId, wishlist }: { userId?: string; wishlist?: unknown }) => {
        if (!userId) return
        socket.to(`user:${userId}`).emit("commerce:wishlist-updated", { wishlist })
      })
    })

    res.socket.server.io = io
    setIoServer(io)
  }

  res.end()
}
