import { PieceColor, PieceType } from "./global.enums.js"

export type Position = {
  row: number,
  col: number
}

export type PreviousMove = {
  from: Position,
  to: Position
}

export type Move = {
  from: number,
  to: number,
  type: PieceType,
  color: PieceColor
}

export type ValidMoves = {
  normalMoves: Array<number>,
  captureMoves: Array<number>
}