import { Request, Response, Router } from "express";
import { Game, Player } from "../types/global.interfaces.js";
import { retrieveAGame, retrieveAPlayer } from "../redis/gameDataStorage.js";
import { CacheGetError } from "../errors/redisCacheErrors.js";
import { PieceColor } from "../types/global.enums.js";

const router: Router = Router()

async function joinNewGame(req: Request, res: Response) {
  try {
    const {gameid, playerid} = req.body

    if(!gameid) {
      res.status(422).send()
      return
    }

    const game: Game = await retrieveAGame(gameid)
    
    // if user cannot join the game but only watch it
    if(game.started) {
      res.status(403).send()
      return
    }

    // if owner wants to join his own game
    if(playerid === game.owner) {
      res.status(204).send()
      return
    }

    const player: Player = await retrieveAPlayer(game.owner)

    let color: PieceColor | null = null

    if(player.color === PieceColor.WHITE) {
      color = PieceColor.BLACK
    } else {
      color = PieceColor.WHITE
    }

    res.status(200).json({
      color
    })

  } catch(e) {
    if(e instanceof CacheGetError) {
      console.log(e)
      res.status(404).send()
    }

    console.log(e)
    res.status(500).send()
  }

}

router.post("/", (req: Request, res: Response) => {
  joinNewGame(req, res)
})

export default router