import { Server, Socket } from "socket.io";
import { InvalidParameterError } from "../errors/redisCacheErrors.js";
import redisClient from "../config/redisClient.js";
import { addNewMessageToChat, cacheNewChat } from "../redis/gameDataStorage.js";
import { ChatData } from "../types/global.interfaces.js";

export async function handleChat(socket: Socket, io: Server) {
  socket.on("chat", async (payload) => {
    try{
      const { gameid, senderid, text, timestamp } = payload

      if(!gameid) {
        throw new InvalidParameterError("gameid")
      }

      if(!senderid) {
        throw new InvalidParameterError("senderid")
      }

      if(!text) {
        throw new InvalidParameterError("text")
      }

      if(!timestamp) {
        throw new InvalidParameterError("timestamp")
      }

      const key = `game:${gameid}:chat`
      const newChat: ChatData = {
        senderid: senderid,
        text: text,
        timestamp: timestamp
      }

      const doesChatExist = await redisClient.exists(key)

      if(doesChatExist === 0) {
        await cacheNewChat(gameid, key, newChat)
        io.to(gameid).emit("chat-success", newChat)
        return
      }

      await addNewMessageToChat(key, newChat)
      io.to(gameid).emit("chat-success", newChat)
      
    } catch(e) {
      console.error(e)
    }
  })
}