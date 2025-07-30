import { Server, Socket } from "socket.io"
import { InvalidParameterError } from "../errors/redisCacheErrors.js"
import { Game, Player } from "../types/global.interfaces.js"
import { cacheNewPlayer, retrieveAGame, retrieveAPlayer, updateGame } from "../redis/gameDataStorage.js"
import { PieceColor } from "../types/global.enums.js"

export async function handleJoinGame(socket: Socket, io: Server) {
  
    socket.on("join-game", async ({ gameid, playerid }) => {
      try {

        if(!gameid) {
          throw new InvalidParameterError("gameid")
        }

        if(!playerid) {
          throw new InvalidParameterError("playerid")
        }

        const game: Game = await retrieveAGame(gameid)

        if(playerid === game.player1 || playerid === game.player2) {
          socket.join(gameid)
          console.log(`Player ${playerid} joined room ${gameid} with socket ${socket.id}`)
          return
        }

        console.log(playerid, gameid)

        console.log("player could not join the game")
    } 
    catch(e) {
      console.error(e)
    }
  })
}

export async function handleJoinNewGame(socket: Socket, io: Server) {
  socket.on("join-new-game", async ({gameid}) => {
    try {
      if(!gameid) {
        throw new InvalidParameterError("gameid")
      }

      const game: Game = await retrieveAGame(gameid)
      const opponent: Player = await retrieveAPlayer(game.owner)
      const opponentColor = opponent.color

      const color = opponentColor === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE

      if(game.started === false && !(game.player2)) {
        const newPlayerId = crypto.randomUUID()
        game.started = true
        game.player2 = newPlayerId
        await cacheNewPlayer(newPlayerId, color)
        await updateGame(gameid, game)
        socket.join(gameid)
        socket.to(gameid).emit("player-joined", {gameid})
        socket.emit("join-success", {gameid, playerid: newPlayerId, color})
        console.log(`Player ${newPlayerId} joined room ${gameid} with socket ${socket.id}`)
        return
      }

      socket.emit("join-fail", {gameid})

    } 
    catch(e) {
      console.error(e)
    }
  })
}