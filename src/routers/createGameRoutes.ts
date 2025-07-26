import { Request, Response, Router } from "express";
import { cacheGameState, cacheNewGame, cacheNewPlayer, deleteAGame, retrieveAGame } from "../redis/gameDataStorage.js";
import Game from "../chess/Game.js";

const router: Router = Router()


async function createNewGame(req: Request, res: Response) {
  try {
    const {gameid, playerid, color} = req.body

    if(!color) {
      res.status(422).send()
      return
    }

    // delete previous game if player sends gameid
    if(gameid) {
      try {

        const gameData = await retrieveAGame(gameid)

        if(gameData.owner === playerid) {
          await deleteAGame(gameid, gameData.player1, gameData.player2)
        }
      } catch(e: any) {
        console.warn(`Unable to delete old Game: ${e.message}`)
      } 
    }

    const newGameid = crypto.randomUUID()
    const newPlayerid = crypto.randomUUID()

    // save new game and player in redis
    await cacheNewGame(newPlayerid, newGameid)
    await cacheNewPlayer(newPlayerid, color)

    // create new game state and save
    const newGame = new Game()
    const newGameState = newGame.serializeStateForRedis()
    await cacheGameState(newGameid, newGameState)
      
    res.status(200).json({
      gameid: newGameid, 
      playerid: newPlayerid,
      color
    })

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

router.post("/", async (req: Request, res: Response) => {
  await createNewGame(req, res)
})

export default router