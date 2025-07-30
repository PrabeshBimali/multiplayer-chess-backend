import { PieceColor, PieceType } from "../types/global.enums.js";
import { GameState } from "../types/global.interfaces.js";
import { Position, PreviousMove, Move, ValidMoves } from "../types/global.types.js";
import BitBoard from "./BitBoard.js";

export default class Game {
  private turn: PieceColor = PieceColor.WHITE
  private fen: string
  private bitboard: BitBoard = new BitBoard()
  private checkmate: PieceColor | null = null
  private previousMove: PreviousMove | null = null

  constructor() {
    this.fen = this.bitboard.generateFENFromBitBoard()
  }

  private positionToBitBoardIndex(row: number, col: number): number {
    return ((7-row) * 8) + (7-col)
  }

  moveAPiece(from: Position, to: Position, type: PieceType, color: PieceColor) {

    if(this.checkmate !== null) return

    if(this.turn !== color) {
      throw new Error(`Not ${color} Turn`)
    }

    const fromPosition: number = this.positionToBitBoardIndex(from.row, from.col)
    const toPosition: number = this.positionToBitBoardIndex(to.row, to.col)

    const move: Move = {
      from: fromPosition,
      to: toPosition,
      type: type,
      color: color
    }

    this.bitboard.makeMove(move)
    this.fen = this.bitboard.generateFENFromBitBoard()
    this.previousMove = {from, to}

    // if pawn can promote do not change turn or check checkmate for now 
    if(type === PieceType.PAWN && this.bitboard.canPawnPromote(color)) {
      return
    }

    this.turn = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE
    this.checkmate = this.bitboard.getCheckmate()
  }

  canPawnPromote(color: PieceColor): boolean {
    return this.bitboard.canPawnPromote(color)
  }

  promoteAPawn(color: PieceColor, type: PieceType) {

    if(this.checkmate !== null) return

    if(this.turn !== color) {
      throw new Error(`Not ${color} Turn`)
    }
    this.bitboard.promoteAPawn(color, type)
    this.fen = this.bitboard.generateFENFromBitBoard()
    this.turn = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE
    this.checkmate = this.bitboard.getCheckmate()
  }

  getPossibleMovesForAPiece(piecesPos: Position, type: PieceType, color: PieceColor): ValidMoves {
    
    if(this.turn !== color) {
      throw new Error(`Not ${color} Turn`)
    }

    const position = this.positionToBitBoardIndex(piecesPos.row, piecesPos.col)
    return this.bitboard.getValidSquaresForFrontend(position, type, color)
  }

  initializeGame(state: GameState) {
    this.turn  = state.turn
    this.checkmate = state.checkmate
    this.fen = state.fen
    this.previousMove = state.previousMove
    this.bitboard.initializeBitBoard(state.bitBoard)
  }

  serializeStateForRedis(): GameState {
    return {
      fen: this.fen,
      turn: this.turn,
      checkmate: this.checkmate,
      previousMove: this.previousMove,
      bitBoard: this.bitboard.searializeStateForRedis()
    }
  }

  getFen(): string {
    return this.fen
  }

  getTurn(): PieceColor {
    return this.turn
  }

  getCheckmate(): PieceColor | null {
    return this.checkmate
  }

  getPreviousMove(): PreviousMove | null {
    return this.previousMove
  }
}