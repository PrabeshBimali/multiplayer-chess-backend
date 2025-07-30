import { Request, Response, Router } from "express";
import { GameState, MoveResult } from "../types/global.interfaces.js";
import { retrieveGameState } from "../redis/gameDataStorage.js";
import { CacheGetError } from "../errors/redisCacheErrors.js";

const router: Router = Router()

async function getGameState(req: Request, res: Response) {
  try {
    console.log("API hit")

    if(!req.query.gameid) {
      res.status(422).send()
      return
    }
    
    const gameid  = req.query.gameid.toString()

    const gameState: GameState = await retrieveGameState(gameid)

    const state: MoveResult = {
      fen: gameState.fen,
      checkmate: gameState.checkmate,
      turn: gameState.turn,
      previousMove: gameState.previousMove
    }

    res.status(200).json({
      state
    })
  } catch(e) {
    if(e instanceof CacheGetError) {
      res.status(404).send()
      return
    }

    console.error(e)
    res.status(500).send()
  }
}

router.get("/game-state", async (req: Request, res: Response) => {
  await getGameState(req, res)
})

export default router