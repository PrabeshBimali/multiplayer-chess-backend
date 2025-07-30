import { PieceColor, PieceType } from "./global.enums.js"
import { Position, PreviousMove } from "./global.types.js"

export interface Game {
  player1: string | null,
  player2: string | null,
  owner: string,
  started: boolean
}

export interface Player {
  color: PieceColor
}

export interface GameState {
  turn: PieceColor,
  fen: string,
  checkmate: PieceColor | null,
  previousMove: PreviousMove | null,
  bitBoard: BitBoardState
}

export interface MoveResult {
  turn: PieceColor,
  fen: string,
  checkmate: PieceColor | null,
  previousMove: PreviousMove | null
}

export interface MovePayload {
  playerid: string
  gameid: string
  color: PieceColor
  type: PieceType
  from: Position
  to: Position
}

export interface BitBoardState {
  piecesPosition: string,

  // castling rights
  whiteKingMoved : boolean
  blackKingMoved: boolean
  whiteRookA1MovedOrCaptured: boolean
  whiteRookH1MovedOrCaptured: boolean
  blackRookA8MovedOrCaptured: boolean
  blackRookH8MovedOrCaptured: boolean
  
  // previous state to undo moves
  prevPiecesPosition: string

  prevWhiteKingMoved: boolean
  prevBlackKingMoved: boolean
  prevWhiteRookA1MovedOrCaptured: boolean
  prevWhiteRookH1MovedOrCaptured: boolean
  prevBlackRookA8MovedOrCaptured: boolean
  prevBlackRookH8MovedOrCaptured: boolean


  checkmate: PieceColor | null

  whiteEnPassantSquares: string
  blackEnPassantSquares: string
}
