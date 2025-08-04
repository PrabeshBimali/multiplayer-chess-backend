import { Server, Socket } from "socket.io";
import { InvalidParameterError } from "../errors/redisCacheErrors.js";
import { deleteAGame, retrieveAGame } from "../redis/gameDataStorage.js";

export async function handleEndGame(socket: Socket, io: Server) {
  try {

    socket.on("end-game", async (payload) => {
      const { gameid, playerid } = payload

      if(!gameid) {
        throw new InvalidParameterError("gameid")
      }

      if(!playerid) {
        throw new InvalidParameterError("playerid")
      }

      const game = await retrieveAGame(gameid)

      if(game.owner !== playerid) {
        socket.emit("end-game-auth-error")
        return
      }

      await deleteAGame(gameid, game.player1, game.player2)

      io.to(gameid).emit("end-game-success", {playerid})
    })

  } catch(e) {
    console.error(e)
  }
}