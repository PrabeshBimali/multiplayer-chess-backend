import { Server, Socket } from "socket.io";
import { InvalidParameterError } from "../errors/redisCacheErrors.js";
import { GameState, MovePayload, MoveResult, Player } from "../types/global.interfaces.js";
import { retrieveAPlayer, retrieveGameState, updateGameState } from "../redis/gameDataStorage.js";
import Game from "../chess/Game.js";
import { ValidMoves } from "../types/global.types.js";
import { ChessClientError } from "../errors/chessClientErrors.js";

export async function handlePieceMove(socket: Socket, io: Server) {
  socket.on("move", async (payload) => {
    try {
      const {playerid, gameid, from, to, type, color} = payload

      if(!playerid) {
        throw new InvalidParameterError("playerid")
      }
      
      if(!gameid) {
        throw new InvalidParameterError("gameid")
      }
      
      if(!from) {
        throw new InvalidParameterError("from")
      }
      
      if(!to) {
        throw new InvalidParameterError("to")
      }
      
      if(!type) {
        throw new InvalidParameterError("type")
      }
      
      if(!color) {
        throw new InvalidParameterError("color")
      }

      const movePayload: MovePayload = {
        playerid: playerid,
        gameid: gameid,
        from: from,
        to: to,
        type: type,
        color: color
      }

      const gameState: GameState = await retrieveGameState(gameid)
      const player: Player = await retrieveAPlayer(playerid)

      if(player.color !== movePayload.color) {
        throw new Error("Player color did not match")
      }

      const game = new Game()
      game.initializeGame(gameState)
      game.moveAPiece(movePayload.from, movePayload.to, movePayload.type, movePayload.color)
      const newGameState = game.serializeStateForRedis()

      await updateGameState(gameid, newGameState)

      const moveResult: MoveResult = {
        turn: game.getTurn(),
        fen: game.getFen(),
        checkmate: game.getCheckmate(),
        previousMove: game.getPreviousMove()
      }

      if(game.canPawnPromote(color)) {
        socket.emit("pawn-can-promote")
      }

      io.to(gameid).emit("move-success", moveResult)

    } catch(e) {

      if(e instanceof ChessClientError) {
        socket.emit("move-error", e.message)
        return
      }

      console.error(e)
    }
  })
}

export async function handleValidMoves(socket: Socket, io: Server) {
  socket.on("valid-moves", async (payload) => {
    try{
      const {playerid, gameid, position, type, color} = payload

      if(!playerid) {
        throw new InvalidParameterError("playerid")
      }
      
      if(!gameid) {
        throw new InvalidParameterError("gameid")
      }
      
      if(!position) {
        throw new InvalidParameterError("position")
      }
      
      if(!type) {
        throw new InvalidParameterError("type")
      }
      
      if(!color) {
        throw new InvalidParameterError("color")
      }
      
      const gameState: GameState = await retrieveGameState(gameid)
      const player: Player = await retrieveAPlayer(playerid)

      if(player.color !== color) {
        throw new Error("Player color did not match")
      }

      const game = new Game()
      game.initializeGame(gameState)
      const moves: ValidMoves = game.getPossibleMovesForAPiece(position, type, color)

      socket.emit("valid-moves-success", moves)

    } catch(e) {
      console.error(e)
    }

  })
}

export async function handlePawnPromote(socket: Socket, io: Server) {
  socket.on("promote-pawn", async (payload) => {
    try {
      const {playerid, gameid, type, color} = payload

      if(!playerid) {
        throw new InvalidParameterError("playerid")
      }
      
      if(!gameid) {
        throw new InvalidParameterError("gameid")
      }
      
      if(!type) {
        throw new InvalidParameterError("type")
      }
      
      if(!color) {
        throw new InvalidParameterError("color")
      }

      const gameState: GameState = await retrieveGameState(gameid)
      const player: Player = await retrieveAPlayer(playerid)

      if(player.color !== color) {
        throw new Error("Player color did not match")
      }

      const game = new Game()
      game.initializeGame(gameState)
      game.promoteAPawn(color, type)
      const newGameState = game.serializeStateForRedis()

      await updateGameState(gameid, newGameState)

      const moveResult: MoveResult = {
        turn: game.getTurn(),
        fen: game.getFen(),
        checkmate: game.getCheckmate(),
        previousMove: game.getPreviousMove()
      }

      io.to(gameid).emit("promote-success", moveResult)
    } catch(e) {
      console.error(e)
    }
  })
}