"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

let socketSingleton: Socket | null = null
let socketBootstrapPromise: Promise<void> | null = null

function getSocket() {
  if (socketSingleton) return socketSingleton
  socketSingleton = io({
    path: "/api/socket/io",
    addTrailingSlash: false,
    autoConnect: false,
  })
  return socketSingleton
}

async function bootstrapSocketServer() {
  if (!socketBootstrapPromise) {
    socketBootstrapPromise = fetch("/api/socket/io", { cache: "no-store" })
      .then(() => undefined)
      .catch(() => undefined)
  }
  await socketBootstrapPromise
}

export function useRealtimeSocket(userId?: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!userId) {
      setSocket(null)
      return
    }

    let canceled = false
    let instance: Socket | null = null
    let joinListener: (() => void) | null = null

    const setup = async () => {
      await bootstrapSocketServer()
      if (canceled) return

      instance = getSocket()
      const join = () => {
        instance?.emit("user:join", { userId })
      }
      joinListener = join

      if (!instance.connected) {
        instance.connect()
      } else {
        join()
      }

      instance.on("connect", join)
      setSocket(instance)
    }

    void setup()

    return () => {
      canceled = true
      if (instance && joinListener) {
        instance.off("connect", joinListener)
      }
    }
  }, [userId])

  return socket
}
