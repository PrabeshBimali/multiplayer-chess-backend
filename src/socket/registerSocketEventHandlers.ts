import { Server, Socket } from "socket.io"
import { handleJoinGame, handleJoinNewGame } from "./joinGameHandler.js"

export default async function registerSocketEventHandlers(socket: Socket, io: Server) {
  await handleJoinGame(socket, io)
  await handleJoinNewGame(socket, io)
}