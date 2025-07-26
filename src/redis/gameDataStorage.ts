import redisClient from "../config/redisClient.js";
import { CacheGetError, CacheSetError, InvalidParameterError } from "../errors/redisCacheErrors.js";
import { PieceColor } from "../types/global.enums.js";
import { Game, GameState, Player } from "../types/global.interfaces.js";

const GAME_EXPIRATION_TIME = 60 * 60 * 2 // in 2  houts

export async function cacheGameState(gameid: string, state: GameState) {
  if(!gameid) {
    throw new InvalidParameterError("gameid")
  }

  if(!state) {
    throw new InvalidParameterError("state")
  }

  const stateJson = JSON.stringify(state)
  const isOk = await redisClient.set(`gameState:${gameid}`, stateJson, {
    EX: GAME_EXPIRATION_TIME,
    NX: true
  })

  if(!isOk) {
    throw new CacheSetError(`gameState:${gameid}`)
  }
}

export async function retrieveGameState(gameid: string): Promise<GameState> {

  if(!gameid) {
    throw new InvalidParameterError("gameid")
  }

  const stateJson = await redisClient.get(`gameState:${gameid}`)

  if(!stateJson) {
    throw new CacheGetError(`gameState:${gameid}`)
  }

  // TODO: Add basic validation here
  const parsedData: GameState = JSON.parse(stateJson) as GameState
  return parsedData
}

export async function cacheNewGame(ownerid: string, gameid: string) {
  if(!ownerid) {
    throw new InvalidParameterError("ownerid")
  }

  if(!gameid) {
    throw new InvalidParameterError("gameid")
  }

  const newGame: Game = {
    player1: ownerid,
    player2: null,
    owner: ownerid,
    started: false
  }

  const jsonString = JSON.stringify(newGame)
  const isOk = await redisClient.set(`game:${gameid}`, jsonString, {
    EX: GAME_EXPIRATION_TIME,
    NX: true,
  })

  if(!isOk) {
    throw new CacheSetError(`game:${gameid}`)
  }
}

export async function updateGame(gameid: string, game: Game) {
  if(!gameid) {
    throw new InvalidParameterError("gameid")
  }

  if(!game) {
    throw new InvalidParameterError("game")
  }

  const jsonString = JSON.stringify(game)
  const isOk = await redisClient.set(`game:${gameid}`, jsonString, {
    KEEPTTL: true
  })

  if(!isOk) {
    throw new CacheSetError(`game:${gameid}`)
  }
}

export async function retrieveAGame(gameid: string): Promise<Game> {
  if(!gameid) {
    throw new InvalidParameterError("gameid")
  }

  const gameJson = await redisClient.get(`game:${gameid}`)

  if(!gameJson) {
    throw new CacheGetError(`game:${gameid}`)
  }

  // Add basic validation here
  const parsedData = JSON.parse(gameJson) as Game
  return parsedData
}

export async function cacheNewPlayer(playerid: string, color: PieceColor) {
  if(!playerid) {
    throw new InvalidParameterError("playerid")
  }

  if(!color) {
    throw new InvalidParameterError("color")
  }

  const newPlayer: Player = {
    color: color
  }

  const jsonString = JSON.stringify(newPlayer)
  const isOk = await redisClient.set(`player:${playerid}`, jsonString, {
    EX: GAME_EXPIRATION_TIME,
    NX: true
  })
  
  if(!isOk) {
    throw new CacheSetError(`player:${playerid}`)
  }
}

export async function retrieveAPlayer(playerid: string): Promise<Player> {
  if(!playerid) {
    throw new InvalidParameterError("playerid")
  }

  const playerJson = await redisClient.get(`player:${playerid}`)

  if(!playerJson) {
    throw new CacheGetError(`player:${playerid}`)
  }

  // Add basic validation here
  const parsedData = JSON.parse(playerJson) as Player
  return parsedData
}

// deletes game and its players from cache
export async function deleteAGame(gameid: string, player1id: string | null = null, player2id: string | null = null) {
  if(!gameid) {
    throw new InvalidParameterError("gameid")
  }

  let player1: string | null = ""
  let player2: string | null = ""

  if(player1id && player2id) {
    player1 = player1id
    player2 = player2id
  } else {
    const gameData: Game = await retrieveAGame(gameid)
    player1 = gameData.player1
    player2 = gameData.player2
  }

  await redisClient.del(`player:${player1}`)
  await redisClient.del(`player:${player2}`)
  await redisClient.del(`game:${gameid}`)
  await redisClient.del(`gameState:${gameid}`)
}