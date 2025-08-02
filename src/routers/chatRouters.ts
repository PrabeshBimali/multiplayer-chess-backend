import { Request, Response, Router } from "express";
import { ChatData } from "../types/global.interfaces.js";
import { retrieveAChat } from "../redis/gameDataStorage.js";

const router: Router = Router()

async function getAllChat(req: Request, res: Response) {
  try {
    if(!req.query.gameid) {
      res.status(422).send()
      return
    }
    
    const gameid  = req.query.gameid.toString()

    const chatKey = `game:${gameid}:chat`

    const chats: Array<ChatData> = await retrieveAChat(chatKey)
    res.status(200).json(chats)

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

router.get("/", async (req: Request, res: Response) => {
  await getAllChat(req, res)
})

export default router