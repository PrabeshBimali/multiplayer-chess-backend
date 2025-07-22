import { Request, Response, Router } from "express";
import { cacheNewGame, deleteAGame, retrieveAGame } from "../redis/gameDataStorage.js";

const router: Router = Router()


async function createNewGame(req: Request, res: Response) {
  try {

    const {gameid, playerid} = req.body

    if(!gameid || !playerid) {
      res.status(422).send()
      return
    }

    // delete previous game for the user first
    const gameData = await retrieveAGame(gameid)

    if(gameData.owner === playerid) {
      await deleteAGame(gameid, gameData.player1, gameData.player2)
    }

    const newGameid = crypto.randomUUID()
    const newPlayerid = crypto.randomUUID()

    // save data in redis
    await cacheNewGame(newPlayerid, newGameid)
      
    res.status(200).json({
      newGameid, newPlayerid
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