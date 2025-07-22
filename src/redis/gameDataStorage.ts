import redisClient from "../config/redisClient.js";
import { PieceColor } from "../types/global.enums.js";
import { Game, GameState, Player } from "../types/global.interfaces.js";

const GAME_EXPIRATION_TIME = 60 * 60 * 2 // in 2  houts

export async function cacheGameState(gameid: string, state: GameState) {
  if(!gameid || !state) {
    throw new Error("Invalid Parameters!")
  }
  const stateJson = JSON.stringify(state)
  await redisClient.set(`gameState:${gameid}`, stateJson, {
    EX: GAME_EXPIRATION_TIME,
    NX: true
  })
}

export async function retrieveGameState(gameid: string): Promise<GameState> {

  if(!gameid) {
    throw new Error("Invalid Parameters!")
  }

  const stateJson = await redisClient.get(`gameState:${gameid}`)

  if(!stateJson) {
    throw new Error(`Cannot find Game state for ${gameid} in cache`)
  }

  // TODO: Add basic validation here
  const parsedData: GameState = JSON.parse(stateJson) as GameState
  return parsedData
}

export async function cacheNewGame(ownerid: string, gameid: string) {
  if(!ownerid || !gameid) {
    throw new Error("Invalid Parameters!")
  }

  const newGame: Game = {
    player1: ownerid,
    player2: null,
    owner: ownerid,
    started: false
  }

  const jsonString = JSON.stringify(newGame)
  await redisClient.set(`game:${gameid}`, jsonString, {
    EX: GAME_EXPIRATION_TIME,
    NX: true
  })
}

export async function retrieveAGame(gameid: string): Promise<Game> {
  if(!gameid) {
    throw new Error("Invalid Parameters!")
  }

  const gameJson = await redisClient.get(`game:${gameid}`)

  if(!gameJson) {
    throw new Error(`No Game with id: ${gameid} found in cache`)
  }

  // Add basic validation here
  const parsedData = JSON.parse(gameJson) as Game
  return parsedData
}

export async function cacheNewPlayer(playerid: string, color: PieceColor) {
  if(!playerid || !color) {
    throw new Error("Invalid Parameters!")
  }

  const newPlayer: Player = {
    color: color
  }

  const jsonString = JSON.stringify(newPlayer)
  await redisClient.set(`player:${playerid}`, jsonString, {
    EX: GAME_EXPIRATION_TIME,
    NX: true
  })
}

export async function retrieveAPlayer(playerid: string): Promise<Player> {
  if(!playerid) {
    throw new Error("Invalid Parameters!")
  }

  const playerJson = await redisClient.get(`player:${playerid}`)

  if(!playerJson) {
    throw new Error(`No Player with id: ${playerid} found in cache`)
  }

  // Add basic validation here
  const parsedData = JSON.parse(playerJson) as Player
  return parsedData
}

// deletes game and its players from cache
export async function deleteAGame(gameid: string, player1id: string | null = null, player2id: string | null = null) {
  if(!gameid) {
    throw new Error("Invalid Parameters")
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