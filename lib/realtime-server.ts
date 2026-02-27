import type { Server as SocketIOServer } from "socket.io"

type GlobalWithIO = typeof globalThis & {
  __tailorhubIoServer?: SocketIOServer
}

const globalWithIO = globalThis as GlobalWithIO

export function setIoServer(io: SocketIOServer) {
  globalWithIO.__tailorhubIoServer = io
}

export function getIoServer() {
  return globalWithIO.__tailorhubIoServer
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  const io = getIoServer()
  if (!io) return
  io.to(`user:${userId}`).emit(event, payload)
}
