"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

let socketSingleton: Socket | null = null

function getSocket() {
  if (socketSingleton) return socketSingleton
  socketSingleton = io({
    path: "/api/socket/io",
    addTrailingSlash: false,
  })
  return socketSingleton
}

export function useRealtimeSocket(userId?: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!userId) return

    const instance = getSocket()
    const join = () => {
      instance.emit("user:join", { userId })
    }

    if (instance.connected) {
      join()
    }

    instance.on("connect", join)
    setSocket(instance)

    return () => {
      instance.off("connect", join)
    }
  }, [userId])

  return socket
}
