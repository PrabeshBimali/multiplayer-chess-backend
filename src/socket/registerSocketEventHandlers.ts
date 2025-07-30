import { Server, Socket } from "socket.io"
import { handleJoinGame, handleJoinNewGame } from "./joinGameHandler.js"
import { handlePawnPromote, handlePieceMove, handleValidMoves } from "./gameMoveHandlers.js"

export default async function registerSocketEventHandlers(socket: Socket, io: Server) {
  await handleJoinGame(socket, io)
  await handleJoinNewGame(socket, io)
  await handlePieceMove(socket, io)
  await handleValidMoves(socket, io)
  await handlePawnPromote(socket, io)
}