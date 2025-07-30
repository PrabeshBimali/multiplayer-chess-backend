import { PieceColor, PieceType, BitboardIndex, indexToFENChar } from "../types/global.enums.js";
import { BitBoardState } from "../types/global.interfaces.js";
import { ValidMoves, Move } from "../types/global.types.js";
import { decodeBigUint64, decodeBigUint64Array, encodeBigUint64, encodeBigUint64Array } from "./helpers/bigIntConverters.js";
import { u64_and, u64_not, u64_or, u64_shl, u64_shr, u64_sub } from "./helpers/uInt64Operations.js"

export default class BitBoard {
  private piecesPosition: BigUint64Array = new BigUint64Array(12)
  private previousPiecesPosition: BigUint64Array = new BigUint64Array(12) // will be used to undo a move

  // for castling rights
  private whiteKingMoved = false;
  private blackKingMoved = false;
  private whiteRookA1MovedOrCaptured = false; // queenside
  private whiteRookH1MovedOrCaptured = false; // kingside
  private blackRookA8MovedOrCaptured = false; // queenside
  private blackRookH8MovedOrCaptured = false; // kingside
  
  // these are needed to revert back state when simulating move
  private prevWhiteKingMoved = false;
  private prevBlackKingMoved = false;
  private prevWhiteRookA1MovedOrCaptured = false; // queenside
  private prevWhiteRookH1MovedOrCaptured = false; // kingside
  private prevBlackRookA8MovedOrCaptured = false; // queenside
  private prevBlackRookH8MovedOrCaptured = false; // kingside

  private checkmate: PieceColor|null = null

  // for checking en passant
  private whiteEnPassantSquares = 0n
  private blackEnPassantSquares = 0n

  constructor() {
    this.createNewBitBoard()
  }

  private createNewBitBoard() {
    // Black Pieces Initial Position
    this.piecesPosition[BitboardIndex.BlackPawns] = 0x00FF000000000000n
    this.piecesPosition[BitboardIndex.BlackRooks] = 0x8100000000000000n
    this.piecesPosition[BitboardIndex.BlackKnights] = 0x4200000000000000n
    this.piecesPosition[BitboardIndex.BlackBishops] = 0x2400000000000000n
    this.piecesPosition[BitboardIndex.BlackQueen] = 0x1000000000000000n
    this.piecesPosition[BitboardIndex.BlackKing] = 0x0800000000000000n

    // White Pieces Initial Position
    this.piecesPosition[BitboardIndex.WhitePawns] = 0x000000000000FF00n
    this.piecesPosition[BitboardIndex.WhiteRooks] = 0x0000000000000081n
    this.piecesPosition[BitboardIndex.WhiteKnights] = 0x0000000000000042n
    this.piecesPosition[BitboardIndex.WhiteBishops] = 0x0000000000000024n
    this.piecesPosition[BitboardIndex.WhiteQueen] = 0x0000000000000010n
    this.piecesPosition[BitboardIndex.WhiteKing] = 0x0000000000000008n

    this.previousPiecesPosition = this.piecesPosition.slice() // copy original state
  }

  private occupiedSquares(): bigint {
    let occupiedSquares: bigint = 0x0n
    for(const val of this.piecesPosition) {
      occupiedSquares = u64_or(occupiedSquares, val)
    }

    return occupiedSquares
  }

  private blackOccupiedSquares(): bigint {
    return u64_or(this.piecesPosition[BitboardIndex.BlackPawns], this.piecesPosition[BitboardIndex.BlackRooks],
            this.piecesPosition[BitboardIndex.BlackKnights], this.piecesPosition[BitboardIndex.BlackBishops],
              this.piecesPosition[BitboardIndex.BlackQueen], this.piecesPosition[BitboardIndex.BlackKing])
  }
  
  private whiteOccupiedSquares(): bigint {
    return u64_or(this.piecesPosition[BitboardIndex.WhitePawns], this.piecesPosition[BitboardIndex.WhiteRooks],
            this.piecesPosition[BitboardIndex.WhiteKnights], this.piecesPosition[BitboardIndex.WhiteBishops],
              this.piecesPosition[BitboardIndex.WhiteQueen], this.piecesPosition[BitboardIndex.WhiteKing])
  }

  // get indices of 1 bits
  private bitScan(bb: bigint): Array<number> {
    const indices: Array<number> = [];
    let index = 0;

    while (bb !== 0n) {
      if ((bb & 1n) === 1n) indices.push(index);
      bb >>= 1n;
      index++;
    }

    return indices;
  }
  
  // to check castling rights
  private updateRookMovedOrCaptured(index: number, color: PieceColor) {
    if(color === PieceColor.WHITE) {
      if (index === 0) this.whiteRookH1MovedOrCaptured = true
      else if(index === 7) this.whiteRookA1MovedOrCaptured = true
    } else {
      if (index === 56) this.blackRookH8MovedOrCaptured = true
      else if (index === 63) this.blackRookA8MovedOrCaptured = true
    }
  }

  private removeBlackPiece(index: number): void {
    const mask: bigint = u64_shl(1n, BigInt(index))

    if (u64_and(this.piecesPosition[BitboardIndex.BlackPawns], mask)) {
      this.piecesPosition[BitboardIndex.BlackPawns] = u64_and(this.piecesPosition[BitboardIndex.BlackPawns], u64_not(mask));
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.BlackRooks], mask)) {
      this.piecesPosition[BitboardIndex.BlackRooks] = u64_and(this.piecesPosition[BitboardIndex.BlackRooks], u64_not(mask));
      this.updateRookMovedOrCaptured(index, PieceColor.BLACK)
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.BlackKnights], mask)) {
      this.piecesPosition[BitboardIndex.BlackKnights] = u64_and(this.piecesPosition[BitboardIndex.BlackKnights], u64_not(mask));
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.BlackBishops], mask)) {
      this.piecesPosition[BitboardIndex.BlackBishops] = u64_and(this.piecesPosition[BitboardIndex.BlackBishops], u64_not(mask));
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.BlackQueen], mask)) {
      this.piecesPosition[BitboardIndex.BlackQueen] = u64_and(this.piecesPosition[BitboardIndex.BlackQueen], u64_not(mask));
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.BlackKing], mask)) {
      this.piecesPosition[BitboardIndex.BlackKing] = u64_and(this.piecesPosition[BitboardIndex.BlackKing], u64_not(mask));
    }
  }
  
  private removeWhitePiece(index: number): void {
    const mask: bigint = u64_shl(1n, BigInt(index))

    if (u64_and(this.piecesPosition[BitboardIndex.WhitePawns], mask)) {
      this.piecesPosition[BitboardIndex.WhitePawns] = u64_and(this.piecesPosition[BitboardIndex.WhitePawns], u64_not(mask));
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.WhiteRooks], mask)) {
      this.piecesPosition[BitboardIndex.WhiteRooks] = u64_and(this.piecesPosition[BitboardIndex.WhiteRooks], u64_not(mask));
      this.updateRookMovedOrCaptured(index, PieceColor.WHITE)
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.WhiteKnights], mask)) {
      this.piecesPosition[BitboardIndex.WhiteKnights] = u64_and(this.piecesPosition[BitboardIndex.WhiteKnights], u64_not(mask));
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.WhiteBishops], mask)) {
      this.piecesPosition[BitboardIndex.WhiteBishops] = u64_and(this.piecesPosition[BitboardIndex.WhiteBishops], u64_not(mask));
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.WhiteQueen], mask)) {
      this.piecesPosition[BitboardIndex.WhiteQueen] = u64_and(this.piecesPosition[BitboardIndex.WhiteQueen], u64_not(mask));
    }
    else if (u64_and(this.piecesPosition[BitboardIndex.WhiteKing], mask)) {
      this.piecesPosition[BitboardIndex.WhiteKing] = u64_and(this.piecesPosition[BitboardIndex.WhiteKing], u64_not(mask));
    }
  }


  generateFENFromBitBoard(): string {
    const bbToString: Array<string | null> = new Array<string|null>(64).fill(null)
    let fen: string = "" 

    for(let i = 0; i < 12; i++) {
      let mask: bigint = this.piecesPosition[i]
      let index: number = 63;

      while(mask !== 0n) {
        if(u64_and(mask, 1n) === 1n) {
          bbToString[index] = indexToFENChar[i as BitboardIndex]
        }

        mask = u64_shr(mask, 1n)
        index--
      }
    }

    for(let rank = 0; rank < 8; rank++) {
      let empty: number = 0
      for(let file = 0; file < 8; file++) {
        const index: number = rank * 8 + file
        if(bbToString[index] !== null) {
          if(empty > 0) {
            fen += empty
          }
          fen += bbToString[index]
          empty = 0
        } else {
          empty++
        }

        if(file === 7 && empty > 0) {
          fen+=empty
        } 
      }
      // Do not add "/" for last row
      if(rank !== 7) {
        fen += "/"
      }
    }
    return fen
  }

  private generatePawnMoves(from: number, color: PieceColor): bigint {
    const occupied = this.occupiedSquares()
    const enemy = color === PieceColor.WHITE ?  u64_or(this.blackOccupiedSquares(), this.blackEnPassantSquares) : u64_or(this.whiteOccupiedSquares(), this.whiteEnPassantSquares)
    const startingRank = color === PieceColor.WHITE ? 0x000000000000FF00n : 0x00FF000000000000n
    const notHFile = 0xfefefefefefefefen;
    const notAFile = 0x7f7f7f7f7f7f7f7fn;
    const singlePush = color === PieceColor.WHITE ? 8n : -8n
    const doublePush = color === PieceColor.WHITE ? 16n: -16n
    const piecePosition = u64_shl(1n, BigInt(from))
    let mask = 0n
    let moves: bigint = 0n


    mask = u64_shl(piecePosition, singlePush)
    if(u64_and(occupied, mask) === 0n) {
      moves = u64_or(moves, mask)

      if(u64_and(piecePosition, startingRank) !== 0n) {
        mask = u64_shl(piecePosition, doublePush)
        if(u64_and(occupied, mask) === 0n) {
          moves = u64_or(moves, mask)
        }
      }
    }

    // for capture
    if(color === PieceColor.WHITE) {
      mask = u64_shl(piecePosition, 9n)
      if(u64_and(piecePosition, notAFile) !== 0n && u64_and(mask, enemy) !== 0n) {
        moves = u64_or(moves, mask)
      }

      mask = u64_shl(piecePosition, 7n)
      if(u64_and(piecePosition, notHFile) !== 0n && u64_and(mask, enemy) !== 0n) {
        moves = u64_or(moves, mask)
      }
    } 
    else {
      mask = u64_shr(piecePosition, 9n)
      if(u64_and(piecePosition, notHFile) !== 0n && u64_and(mask, enemy) !== 0n) {
        moves = u64_or(moves, mask)
      }

      mask = u64_shr(piecePosition, 7n)
      if(u64_and(piecePosition, notAFile) !== 0n && u64_and(mask, enemy) !== 0n) {
        moves = u64_or(moves, mask)
      }

    }
    
    return moves
  }
  
  private moveWhitePawn(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let whitePawns: bigint = this.piecesPosition[BitboardIndex.WhitePawns]
    const blackPieces: bigint = this.blackOccupiedSquares()

    // 1. Check there's a pawn at `from`
    if (u64_and(whitePawns, fromMask) === 0n) {
      throw new Error("No White Pawn at source square");
    }

    // 2. Check if `to` is reachable
    const pawnMoves = this.generatePawnMoves(from, PieceColor.WHITE);

    if (u64_and(pawnMoves, toMask) === 0n) {
      throw new Error("Illegal Pawn move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(blackPieces, toMask) !== 0n) {
      this.removeBlackPiece(to);
    } 
    else if(u64_and(this.blackEnPassantSquares, toMask) !== 0n ) {
        // if to is in en passant square capture to - 8 black pawn
        this.removeBlackPiece(to - 8)
    }

    // 4. Update pawn position
    whitePawns = u64_and(whitePawns, u64_not(fromMask));
    whitePawns = u64_or(whitePawns, toMask);
    this.piecesPosition[BitboardIndex.WhitePawns] = whitePawns

    // if white piece moved 2 place then square below that will be en passant square
    if(to - from === 16) {
      this.whiteEnPassantSquares = u64_shl(1n, BigInt(from + 8))
    }
  }
  
  private moveBlackPawn(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let blackPawns: bigint = this.piecesPosition[BitboardIndex.BlackPawns]
    const whitePieces: bigint = this.whiteOccupiedSquares()

    // 1. Check there's a pawn at `from`
    if (u64_and(blackPawns, fromMask) === 0n) {
      throw new Error("No Black Pawn at source square");
    }

    // 2. Check if `to` is reachable
    const pawnMoves = this.generatePawnMoves(from, PieceColor.BLACK);

    if (u64_and(pawnMoves, toMask) === 0n) {
      throw new Error("Illegal Pawn move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(whitePieces, toMask) !== 0n) {
      this.removeWhitePiece(to);
    } else if(u64_and(this.whiteEnPassantSquares, toMask)) {
        // if to is in white en passant square capture white pawn at to + 8
        this.removeWhitePiece(to + 8)
    }

    // 4. Update pawn position
    blackPawns = u64_and(blackPawns, u64_not(fromMask));
    blackPawns = u64_or(blackPawns, toMask);
    this.piecesPosition[BitboardIndex.BlackPawns] = blackPawns

    // set square below as en passant
    if(from - to === 16) {
      this.blackEnPassantSquares = u64_shl(1n, BigInt(from -8))
    }
  }

  private promoteWhitePawn(type: PieceType) {
    const rank8Mask: bigint = 0xFF00000000000000n
    let allPawns = this.piecesPosition[BitboardIndex.WhitePawns]
    const pawnToPromote = u64_and(allPawns, rank8Mask)

    if(pawnToPromote === 0n) {
      throw new Error(`No White Pawns in Rank 8`)
    }

    // if more than 1 pawn is able to promote
    if(u64_and(pawnToPromote, u64_sub(pawnToPromote, 1n)) !== 0n) {
      throw new Error(`More than 1 White Pawns to Promote`)
    }
    
    // remove pawn from whitePawns
    allPawns = u64_and(allPawns, u64_not(pawnToPromote))
    this.piecesPosition[BitboardIndex.WhitePawns] = allPawns

    // update previous positions
    this.previousPiecesPosition[BitboardIndex.WhitePawns] = allPawns
    switch(type) {
      case PieceType.QUEEN:
        let whiteQueens = this.piecesPosition[BitboardIndex.WhiteQueen]
        whiteQueens = u64_or(whiteQueens, pawnToPromote)
        this.piecesPosition[BitboardIndex.WhiteQueen] = whiteQueens
        this.previousPiecesPosition[BitboardIndex.WhiteQueen] = whiteQueens
        return
      case PieceType.ROOK:
        let whiteRooks = this.piecesPosition[BitboardIndex.WhiteRooks]
        whiteRooks = u64_or(whiteRooks, pawnToPromote)
        this.piecesPosition[BitboardIndex.WhiteRooks] = whiteRooks
        this.previousPiecesPosition[BitboardIndex.WhiteRooks] = whiteRooks
        return
      case PieceType.BISHOP:
        let whiteBishops = this.piecesPosition[BitboardIndex.WhiteBishops]
        whiteBishops = u64_or(whiteBishops, pawnToPromote)
        this.piecesPosition[BitboardIndex.WhiteBishops] = whiteBishops
        this.previousPiecesPosition[BitboardIndex.WhiteBishops] = whiteBishops
        return
      case PieceType.KNIGHT:
        let whiteKnights = this.piecesPosition[BitboardIndex.WhiteKnights]
        whiteKnights = u64_or(whiteKnights, pawnToPromote)
        this.piecesPosition[BitboardIndex.WhiteKnights] = whiteKnights
        this.previousPiecesPosition[BitboardIndex.WhiteKnights] = whiteKnights
        return
    }
  }
  
  private promoteBlackPawn(type: PieceType) {
    const rank1Mask: bigint = 0x00000000000000FFn
    let allPawns = this.piecesPosition[BitboardIndex.BlackPawns]
    const pawnToPromote = u64_and(allPawns, rank1Mask)

    if(pawnToPromote === 0n) {
      throw new Error(`No Black Pawns in Rank 8`)
    }

    // if more than 1 pawn is able to promote
    if(u64_and(pawnToPromote, u64_sub(pawnToPromote, 1n)) !== 0n) {
      throw new Error(`More than 1 Black Pawns to Promote`)
    }
    
    // remove pawn from whitePawns
    allPawns = u64_and(allPawns, u64_not(pawnToPromote))
    this.piecesPosition[BitboardIndex.BlackPawns] = allPawns

    // update previous positions
    this.previousPiecesPosition[BitboardIndex.BlackPawns] = allPawns
    switch(type) {
      case PieceType.QUEEN:
        let queens = this.piecesPosition[BitboardIndex.BlackQueen]
        queens = u64_or(queens, pawnToPromote)
        this.piecesPosition[BitboardIndex.BlackQueen] = queens
        this.previousPiecesPosition[BitboardIndex.BlackQueen] = queens
        return
      case PieceType.ROOK:
        let rooks = this.piecesPosition[BitboardIndex.BlackRooks]
        rooks = u64_or(rooks, pawnToPromote)
        this.piecesPosition[BitboardIndex.BlackRooks] = rooks
        this.previousPiecesPosition[BitboardIndex.BlackRooks] = rooks
        return
      case PieceType.BISHOP:
        let bishops = this.piecesPosition[BitboardIndex.BlackBishops]
        bishops = u64_or(bishops, pawnToPromote)
        this.piecesPosition[BitboardIndex.BlackBishops] = bishops
        this.previousPiecesPosition[BitboardIndex.BlackBishops] = bishops
        return
      case PieceType.KNIGHT:
        let knights = this.piecesPosition[BitboardIndex.BlackKnights]
        knights = u64_or(knights, pawnToPromote)
        this.piecesPosition[BitboardIndex.BlackKnights] = knights
        this.previousPiecesPosition[BitboardIndex.BlackKnights] = knights
        return
    }
  }

  promoteAPawn(color: PieceColor, type: PieceType) {
    if(color === PieceColor.WHITE) {
      this.promoteWhitePawn(type)
    } else {
      this.promoteBlackPawn(type)
    }
  }

  private generateRookMoves(from: number, color: PieceColor): bigint {

    const occupied = this.occupiedSquares()
    const friendly = color === PieceColor.WHITE ? this.whiteOccupiedSquares() : this.blackOccupiedSquares()

    const directions = [+1, -1, +8, -8]; // E, W, N, S
    let moves = 0n;

    for (const dir of directions) {
      let pos = from;

      while (true) {
        pos += dir;

        // Edge check
        if (pos < 0 || pos > 63) break;

        // File edge check (to prevent wraparound)
        if (dir === +1 && pos % 8 === 0) break; // wrapped from h to a
        if (dir === -1 && (pos + 1) % 8 === 0) break; // wrapped from a to h

        const mask = u64_shl(1n, BigInt(pos));

        if (u64_and(friendly, mask) !== 0n) break; // blocked by own piece
        moves |= mask;

        if (u64_and(occupied, mask) !== 0n) break; // blocked by enemy piece (capture allowed but stop)
      }
    }

    return moves;
  }

  private moveWhiteRook(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let whiteRooks: bigint = this.piecesPosition[BitboardIndex.WhiteRooks]
    const blackPieces: bigint = this.blackOccupiedSquares()

    // 1. Check there's a rook at `from`
    if (u64_and(whiteRooks, fromMask) === 0n) {
      throw new Error("No White Rook at source square");
    }

    // 2. Check if `to` is reachable
    const rookMoves = this.generateRookMoves(from, PieceColor.WHITE);

    if (u64_and(rookMoves, toMask) === 0n) {
      throw new Error("Illegal Rook move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(blackPieces, toMask) !== 0n) {
      this.removeBlackPiece(to);
    }

    // 4. Update rook position
    whiteRooks = u64_and(whiteRooks, u64_not(fromMask));
    whiteRooks = u64_or(whiteRooks, toMask);
    this.piecesPosition[BitboardIndex.WhiteRooks] = whiteRooks

    // Check if rook moved
    if(!this.whiteRookA1MovedOrCaptured || !this.whiteRookH1MovedOrCaptured) {
      this.updateRookMovedOrCaptured(from, PieceColor.WHITE)
    }
  }
  
  private moveBlackRook(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let blackRooks: bigint = this.piecesPosition[BitboardIndex.BlackRooks]
    const whitePieces: bigint = this.whiteOccupiedSquares()

    // 1. Check there's a rook at `from`
    if (u64_and(blackRooks, fromMask) === 0n) {
      throw new Error("No Black Rook at source square");
    }

    // 2. Check if `to` is reachable
    const rookMoves = this.generateRookMoves(from, PieceColor.BLACK);

    if (u64_and(rookMoves, toMask) === 0n) {
      throw new Error("Illegal Rook move");
    }

    // 3. If capturing, remove white piece from correct board
    if (u64_and(whitePieces, toMask) !== 0n) {
      this.removeWhitePiece(to);
    }

    // 4. Update rook position
    blackRooks = u64_and(blackRooks, u64_not(fromMask));
    blackRooks = u64_or(blackRooks, toMask);
    this.piecesPosition[BitboardIndex.BlackRooks] = blackRooks

    // update black rook moved or captured
    if(!this.blackRookA8MovedOrCaptured || !this.blackRookH8MovedOrCaptured) {
      this.updateRookMovedOrCaptured(from, PieceColor.BLACK)
    }
  }

  private wrapsAround(from: number, to: number):  boolean {
    const fromFile = from % 8;
    const toFile = to % 8;
    const diff = Math.abs(fromFile - toFile);

    // returns true when move is valid diagonal move
    return diff !== 1;
  }

  private generateBishopMoves(from: number, color: PieceColor): bigint {

    const occupied = this.occupiedSquares()
    const friendly = color === PieceColor.WHITE ? this.whiteOccupiedSquares() : this.blackOccupiedSquares()

    const directions = [+7, +9, -7, -9]; // NW, NE, SE, SW
    let moves = 0n;

    for (const dir of directions) {
      let pos = from;

      while (true) {
        const prev = pos
        pos += dir;

        // Stop if off-board
        if (pos < 0 || pos > 63) break;

        // Prevent wraparound at edges
        if (this.wrapsAround(prev, pos)) break;

        const mask = u64_shl(1n, BigInt(pos));

        if (u64_and(friendly, mask) !== 0n) break; // blocked by own piece
        moves |= mask;

        if (u64_and(occupied, mask) !== 0n) break; // blocked by enemy
      }
    }

    return moves;
  }

  private moveWhiteBishop(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let whiteBishops: bigint = this.piecesPosition[BitboardIndex.WhiteBishops]
    const blackPieces: bigint = this.blackOccupiedSquares()

    // 1. Check there's a Bishop at `from`
    if (u64_and(whiteBishops, fromMask) === 0n) {
      throw new Error("No White Bishop at source square");
    }

    // 2. Check if `to` is reachable
    const bishopMoves = this.generateBishopMoves(from, PieceColor.WHITE);

    if (u64_and(bishopMoves, toMask) === 0n) {
      throw new Error("Illegal Bishop move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(blackPieces, toMask) !== 0n) {
      this.removeBlackPiece(to);
    }

    // 4. Update Bishop position
    whiteBishops = u64_and(whiteBishops, u64_not(fromMask));
    whiteBishops = u64_or(whiteBishops, toMask);
    this.piecesPosition[BitboardIndex.WhiteBishops] = whiteBishops
  }
  
  private moveBlackBishop(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let blackBishops: bigint = this.piecesPosition[BitboardIndex.BlackBishops]
    const whitePieces: bigint = this.whiteOccupiedSquares()

    // 1. Check there's a Bishop at `from`
    if (u64_and(blackBishops, fromMask) === 0n) {
      throw new Error("No White Bishop at source square");
    }

    // 2. Check if `to` is reachable
    const bishopMoves = this.generateBishopMoves(from, PieceColor.BLACK);

    if (u64_and(bishopMoves, toMask) === 0n) {
      throw new Error("Illegal Bishop move");
    }

    // 3. If capturing, remove white piece from correct board
    if (u64_and(whitePieces, toMask) !== 0n) {
      this.removeWhitePiece(to);
    }

    // 4. Update Bishop position
    blackBishops = u64_and(blackBishops, u64_not(fromMask));
    blackBishops = u64_or(blackBishops, toMask);
    this.piecesPosition[BitboardIndex.BlackBishops] = blackBishops
  }

  private generateQueenMoves(from: number, color: PieceColor): bigint {
    const diagonalMoves = this.generateBishopMoves(from, color);
    const linearMoves = this.generateRookMoves(from, color)
    return u64_or(diagonalMoves, linearMoves)
  }
  
  private moveWhiteQueen(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let whiteQueen: bigint = this.piecesPosition[BitboardIndex.WhiteQueen]
    const blackPieces: bigint = this.blackOccupiedSquares()

    // 1. Check there's a Queen at `from`
    if (u64_and(whiteQueen, fromMask) === 0n) {
      throw new Error("No White Queen at source square");
    }

    // 2. Check if `to` is reachable
    const queenMoves = this.generateQueenMoves(from, PieceColor.WHITE);

    if (u64_and(queenMoves, toMask) === 0n) {
      throw new Error("Illegal Queen move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(blackPieces, toMask) !== 0n) {
      this.removeBlackPiece(to);
    }

    // 4. Update Queen position
    whiteQueen = u64_and(whiteQueen, u64_not(fromMask));
    whiteQueen = u64_or(whiteQueen, toMask);
    this.piecesPosition[BitboardIndex.WhiteQueen] = whiteQueen
  }
  
  private moveBlackQueen(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let blackQueen: bigint = this.piecesPosition[BitboardIndex.BlackQueen]
    const whitePieces: bigint = this.whiteOccupiedSquares()

    // 1. Check there's a Queen at `from`
    if (u64_and(blackQueen, fromMask) === 0n) {
      throw new Error("No Black Queen at source square");
    }

    // 2. Check if `to` is reachable
    const queenMoves = this.generateQueenMoves(from, PieceColor.BLACK);

    if (u64_and(queenMoves, toMask) === 0n) {
      throw new Error("Illegal Queen move");
    }

    // 3. If capturing, remove white piece from correct board
    if (u64_and(whitePieces, toMask) !== 0n) {
      this.removeWhitePiece(to);
    }

    // 4. Update Queen position
    blackQueen = u64_and(blackQueen, u64_not(fromMask));
    blackQueen = u64_or(blackQueen, toMask);
    this.piecesPosition[BitboardIndex.BlackQueen] = blackQueen
  }

  private generateKnightMoves(from: number, color: PieceColor): bigint {

    const friendly = color === PieceColor.WHITE ? this.whiteOccupiedSquares() : this.blackOccupiedSquares()

    const fromMask = u64_shl(1n, BigInt(from));

    const notHFile = 0xFEFEFEFEFEFEFEFEn;
    const notGHFile = 0xFCFCFCFCFCFCFCFCn;
    const notAFile = 0x7F7F7F7F7F7F7F7Fn;
    const notABFile = 0x3F3F3F3F3F3F3F3Fn;

    let moves = 0n;

    // ↑↑→ NNE
    if (u64_and(fromMask, notAFile) !== 0n) {
      moves = u64_or(moves, u64_shl(fromMask, 17n));
    }

    // ↑↑← NNW
    if (u64_and(fromMask, notHFile) !== 0n) {
      moves = u64_or(moves, u64_shl(fromMask, 15n));
    }

    // ↑→→ ENE
    if (u64_and(fromMask, notABFile) !== 0n) {
      moves = u64_or(moves, u64_shl(fromMask, 10n));
    }

    // ↑←← WNW
    if (u64_and(fromMask, notGHFile) !== 0n) {
      moves = u64_or(moves, u64_shl(fromMask, 6n));
    }

    // ↓→→ ESE
    if (u64_and(fromMask, notABFile) !== 0n) {
      moves = u64_or(moves, u64_shr(fromMask, 6n));
    }

    // ↓←← WSW
    if (u64_and(fromMask, notGHFile) !== 0n) {
      moves = u64_or(moves, u64_shr(fromMask, 10n));
    }

    // ↓↓→ SSE
    if (u64_and(fromMask & notAFile) !== 0n) {
      moves = u64_or(moves, u64_shr(fromMask, 15n));
    }

    // ↓↓← SSW
    if (u64_and(fromMask & notHFile) !== 0n) {
      moves = u64_or(moves, u64_shr(fromMask, 17n));
    }

    // Filter out friendly pieces
    moves &= ~friendly;
    return moves;

  }

  private moveWhiteKnight(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let whiteKnights: bigint = this.piecesPosition[BitboardIndex.WhiteKnights]
    const blackPieces: bigint = this.blackOccupiedSquares()

    // 1. Check there's a Knight at `from`
    if (u64_and(whiteKnights, fromMask) === 0n) {
      throw new Error("No White Knight at source square");
    }

    // 2. Check if `to` is reachable
    const knightMoves = this.generateKnightMoves(from, PieceColor.WHITE);

    if (u64_and(knightMoves, toMask) === 0n) {
      throw new Error("Illegal Knight move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(blackPieces, toMask) !== 0n) {
      this.removeBlackPiece(to);
    }

    // 4. Update Knight position
    whiteKnights = u64_and(whiteKnights, u64_not(fromMask));
    whiteKnights = u64_or(whiteKnights, toMask);
    this.piecesPosition[BitboardIndex.WhiteKnights] = whiteKnights
  }
  
  private moveBlackKnight(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let blackKnights: bigint = this.piecesPosition[BitboardIndex.BlackKnights]
    const whitePieces: bigint = this.whiteOccupiedSquares()

    // 1. Check there's a Knight at `from`
    if (u64_and(blackKnights, fromMask) === 0n) {
      throw new Error("No White Knight at source square");
    }

    // 2. Check if `to` is reachable
    const knightMoves = this.generateKnightMoves(from, PieceColor.BLACK);

    if (u64_and(knightMoves, toMask) === 0n) {
      throw new Error("Illegal Knight move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(whitePieces, toMask) !== 0n) {
      this.removeWhitePiece(to);
    }

    // 4. Update Knight position
    blackKnights = u64_and(blackKnights, u64_not(fromMask));
    blackKnights = u64_or(blackKnights, toMask);
    this.piecesPosition[BitboardIndex.BlackKnights] = blackKnights
  }
  
  private generateAllPawnAttacks(color: PieceColor): bigint {
    const pawns: bigint = color === PieceColor.WHITE ? this.piecesPosition[BitboardIndex.WhitePawns] : this.piecesPosition[BitboardIndex.BlackPawns];
    let attacks: bigint = 0n

    const indices: Array<number> = this.bitScan(pawns)

    for (const idx of indices) {
      attacks = u64_or(attacks, this.generatePawnMoves(idx, color))
    }

    return attacks
  }

  private generateAllRookAttacks(color: PieceColor): bigint {
    const rooks: bigint = color === PieceColor.WHITE ? this.piecesPosition[BitboardIndex.WhiteRooks] : this.piecesPosition[BitboardIndex.BlackRooks];
    let attacks: bigint = 0n

    const indices: Array<number> = this.bitScan(rooks)

    for (const idx of indices) {
      attacks = u64_or(attacks, this.generateRookMoves(idx, color))
    }

    return attacks
  }
  
  private generateAllBishopAttacks(color: PieceColor): bigint {
    const bishops: bigint = color === PieceColor.WHITE ? this.piecesPosition[BitboardIndex.WhiteBishops] : this.piecesPosition[BitboardIndex.BlackBishops];
    let attacks: bigint = 0n

    const indices: Array<number> = this.bitScan(bishops)

    for (const idx of indices) {
      attacks = u64_or(attacks, this.generateBishopMoves(idx, color))
    }
    return attacks
  }
  
  private generateAllKnightAttacks(color: PieceColor): bigint {
    const knights: bigint = color === PieceColor.WHITE ? this.piecesPosition[BitboardIndex.WhiteKnights] : this.piecesPosition[BitboardIndex.BlackKnights];
    let attacks: bigint = 0n

    const indices: Array<number> = this.bitScan(knights)

    for (const idx of indices) {
      attacks = u64_or(attacks, this.generateKnightMoves(idx, color))
    }
    return attacks
  }
  
  private generateAllQueenAttacks(color: PieceColor): bigint {
    const queens: bigint = color === PieceColor.WHITE ? this.piecesPosition[BitboardIndex.WhiteQueen] : this.piecesPosition[BitboardIndex.BlackQueen];
    let attacks: bigint = 0n

    const indices: Array<number> = this.bitScan(queens)

    for (const idx of indices) {
      attacks = u64_or(attacks, this.generateQueenMoves(idx, color))
    }
    return attacks
  }

  private generateAllKingAttacks(color: PieceColor): bigint {
    const king: bigint = color === PieceColor.WHITE ? this.piecesPosition[BitboardIndex.WhiteKing] : this.piecesPosition[BitboardIndex.BlackKing];
    let attacks: bigint = 0n

    const indices: Array<number> = this.bitScan(king)

    for (const idx of indices) {
      attacks = u64_or(attacks, this.generateKingAttacks(idx, color))
    }
    return attacks
  }

  private generateKingAttacks(from: number, color: PieceColor): bigint {

    const friendly = color === PieceColor.WHITE ? this.whiteOccupiedSquares() : this.blackOccupiedSquares()
    const notHFile = 0xFEFEFEFEFEFEFEFEn;
    const notAFile = 0x7F7F7F7F7F7F7F7Fn;

    const fromMask = u64_shl(1n, BigInt(from));
    let moves = 0n;

    // horizontal/vertical
    if (u64_and(fromMask, notHFile) !== 0n) {
      moves = u64_or(moves, u64_shr(fromMask, 1n));
    }

    if (u64_and(fromMask, notAFile) !== 0n) {
      moves = u64_or(moves, u64_shl(fromMask, 1n));
    }

    moves = u64_or(moves, u64_shr(fromMask, 8n));
    moves = u64_or(moves, u64_shl(fromMask, 8n));

    // diagonals
    if (u64_and(fromMask, notHFile) !== 0n) {
      moves = u64_or(moves, u64_shr(fromMask, 9n));
      moves = u64_or(moves, u64_shl(fromMask, 7n));
    }

    if (u64_and(fromMask, notAFile) !== 0n) {
      moves = u64_or(moves, u64_shl(fromMask, 9n));
      moves = u64_or(moves, u64_shr(fromMask, 7n));
    }

    // remove friendly collisions
    return u64_and(moves, u64_not(friendly));
  }

  private isSquareAttacked(square: number, byColor: PieceColor): boolean {
    const squareMask = u64_shl(1n, BigInt(square))

    const pawnAttacks = this.generateAllPawnAttacks(byColor)
    if(u64_and(pawnAttacks, squareMask) !== 0n) return true
    
    const rookAttacks = this.generateAllRookAttacks(byColor)
    if(u64_and(rookAttacks, squareMask) !== 0n) return true

    const bishopAttacks = this.generateAllBishopAttacks(byColor)
    if(u64_and(bishopAttacks, squareMask) !== 0n) return true

    const knightAttacks = this.generateAllKnightAttacks(byColor)
    if(u64_and(knightAttacks, squareMask) !== 0n) return true

    const queenAttacks = this.generateAllQueenAttacks(byColor)
    if(u64_and(queenAttacks, squareMask) !== 0n) return true

    const kingAttacks = this.generateAllKingAttacks(byColor)
    if(u64_and(kingAttacks, squareMask) !== 0n) return true

    return false
  }

  private canWhiteCastleKingSide(): boolean {
    const occupiedSquares = this.occupiedSquares()
    if(this.whiteKingMoved || this.whiteRookH1MovedOrCaptured) return false

    const g1 = 1, f1 = 2, e1 = 3

    const emptyMask = u64_or(u64_shl(1n, 1n), u64_shl(1n, 2n))
    if(u64_and(emptyMask, occupiedSquares) !== 0n) return false
    
    if(this.isSquareAttacked(e1, PieceColor.BLACK) || 
        this.isSquareAttacked(f1, PieceColor.BLACK) || 
        this.isSquareAttacked(g1, PieceColor.BLACK)) {

          return false
    }
    return true
  }
  
  private canWhiteCastleQueenSide(): boolean {
    const occupiedSquares = this.occupiedSquares()
    if(this.whiteKingMoved || this.whiteRookA1MovedOrCaptured) return false

    const e1 = 3, d1 = 4, c1 = 5, b1 = 6

    const emptyMask = u64_or(u64_shl(1n, 4n), u64_shl(1n, 5n), u64_shl(1n, 6n))
    if(u64_and(emptyMask, occupiedSquares) !== 0n) return false
    
    if(this.isSquareAttacked(e1, PieceColor.BLACK) || 
        this.isSquareAttacked(d1, PieceColor.BLACK) || 
          this.isSquareAttacked(c1, PieceColor.BLACK) ||
            this.isSquareAttacked(b1, PieceColor.BLACK)) {

              return false
    }
    return true
  }

  private canBlackCastleKingSide(): boolean {
    const occupiedSquares = this.occupiedSquares()
    if(this.blackKingMoved || this.blackRookH8MovedOrCaptured) return false

    const g8 = 57, f8 = 58, e8 = 59

    const emptyMask = u64_or(u64_shl(1n, 57n), u64_shl(1n, 58n))
    if(u64_and(emptyMask, occupiedSquares) !== 0n) return false
    
    if(this.isSquareAttacked(e8, PieceColor.WHITE) || 
        this.isSquareAttacked(f8, PieceColor.WHITE) || 
        this.isSquareAttacked(g8, PieceColor.WHITE)) {

          return false
    }
    return true
  }
  
  private canBlackCastleQueenSide(): boolean {
    const occupiedSquares = this.occupiedSquares()
    if(this.blackKingMoved || this.blackRookA8MovedOrCaptured) return false

    const e8 = 59, d8 = 60, c8 = 61, b8 = 62

    const emptyMask = u64_or(u64_shl(1n, 60n), u64_shl(1n, 61n), u64_shl(1n, 62n))
    if(u64_and(emptyMask, occupiedSquares) !== 0n) return false
    
    if(this.isSquareAttacked(e8, PieceColor.WHITE) || 
        this.isSquareAttacked(d8, PieceColor.WHITE) || 
          this.isSquareAttacked(c8, PieceColor.WHITE) ||
            this.isSquareAttacked(b8, PieceColor.WHITE)) {

              return false
    }
    return true
  }
  
  // maybe it will be useful someday
  private generateCastlingMoves(color: PieceColor): bigint {
    let moves: bigint = 0n

    if(color === PieceColor.WHITE) {
      if(this.canWhiteCastleKingSide()) {
        moves = u64_or(moves, u64_shl(1n, BigInt(1)))
      }

      if(this.canWhiteCastleQueenSide()) {
        moves = u64_or(moves, u64_shl(1n, BigInt(5)))
      }
    } else if(color === PieceColor.BLACK) {
      if(this.canBlackCastleKingSide()) {
        moves = u64_or(moves, u64_shl(1n, BigInt(57)))
      }

      if(this.canBlackCastleQueenSide()) {
        moves = u64_or(moves, u64_shl(1n, BigInt(61)))
      }
    }

    return moves
  }

  private moveWhiteKing(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let whiteKing: bigint = this.piecesPosition[BitboardIndex.WhiteKing]
    let whiteRooks = this.piecesPosition[BitboardIndex.WhiteRooks] // for castling
    const blackPieces: bigint = this.blackOccupiedSquares()

    // 1. Check there's a King at `from`
    if (u64_and(whiteKing, fromMask) === 0n) {
      throw new Error("No White King at source square");
    }

    // First do castling moves
    if((this.canWhiteCastleKingSide() && to === 1) || (this.canWhiteCastleQueenSide() && to === 5)) {
      const kingToMask = u64_shl(1n, BigInt(to))
      const kingFromMask = u64_shl(1n, BigInt(from))
      whiteKing = u64_and(whiteKing, u64_not(kingFromMask))
      whiteKing = u64_or(whiteKing, kingToMask)
      this.piecesPosition[BitboardIndex.WhiteKing] = whiteKing

      const rookTo = to === 1 ? to + 1 : to - 1
      const rookFromMask = to === 1 ? 1n : u64_shl(1n, 7n)
      const rookToMask = u64_shl(1n, BigInt(rookTo))
      whiteRooks = u64_and(whiteRooks, u64_not(rookFromMask))
      whiteRooks = u64_or(whiteRooks, rookToMask)
      this.piecesPosition[BitboardIndex.WhiteRooks] = whiteRooks
      return
    }

    // 2. Check if `to` is reachable
    const kingMoves = this.generateKingAttacks(from, PieceColor.WHITE);

    if (u64_and(kingMoves, toMask) === 0n) {
      throw new Error("Illegal King move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(blackPieces, toMask) !== 0n) {
      this.removeBlackPiece(to);
    }

    // 4. Update King position
    whiteKing = u64_and(whiteKing, u64_not(fromMask));
    whiteKing = u64_or(whiteKing, toMask);
    this.piecesPosition[BitboardIndex.WhiteKing] = whiteKing

    this.whiteKingMoved = true
  }
  
  private moveBlackKing(from: number, to: number) {

    if(from === to) {
      throw new Error("Cannot move to same square")
    }
    
    if(to < 0 && to > 63) {
      throw new Error("Illegal Move")
    }

    const fromMask = u64_shl(1n, BigInt(from));
    const toMask = u64_shl(1n, BigInt(to));
    let blackKing: bigint = this.piecesPosition[BitboardIndex.BlackKing]
    let blackRooks: bigint = this.piecesPosition[BitboardIndex.BlackRooks]
    const whitePieces: bigint = this.whiteOccupiedSquares()

    // 1. Check there's a King at `from`
    if (u64_and(blackKing, fromMask) === 0n) {
      throw new Error("No Black King at source square");
    }
    
    // First do castling moves
    if((this.canBlackCastleKingSide() && to === 57) || (this.canBlackCastleQueenSide() && to === 61)) {
      const kingToMask = u64_shl(1n, BigInt(to))
      const kingFromMask = u64_shl(1n, BigInt(from))
      blackKing = u64_and(blackKing, u64_not(kingFromMask))
      blackKing = u64_or(blackKing, kingToMask)
      this.piecesPosition[BitboardIndex.BlackKing] = blackKing

      const rookTo = to === 57 ? to + 1 : to - 1
      const rookFromMask = to === 57 ? u64_shl(1n, 56n) : u64_shl(1n, 63n)
      const rookToMask = u64_shl(1n, BigInt(rookTo))
      blackRooks = u64_and(blackRooks, u64_not(rookFromMask))
      blackRooks = u64_or(blackRooks, rookToMask)
      this.piecesPosition[BitboardIndex.BlackRooks] = blackRooks
      return
    }

    // 2. Check if `to` is reachable
    const kingMoves = this.generateKingAttacks(from, PieceColor.BLACK);

    if (u64_and(kingMoves, toMask) === 0n) {
      throw new Error("Illegal King move");
    }

    // 3. If capturing, remove black piece from correct board
    if (u64_and(whitePieces, toMask) !== 0n) {
      this.removeWhitePiece(to);
    }

    // 4. Update King position
    blackKing = u64_and(blackKing, u64_not(fromMask));
    blackKing = u64_or(blackKing, toMask);
    this.piecesPosition[BitboardIndex.BlackKing] = blackKing

    this.blackKingMoved = true;
  }

  private isInCheck(color: PieceColor): boolean {

    const king = color === PieceColor.WHITE ? this.piecesPosition[BitboardIndex.WhiteKing] : this.piecesPosition[BitboardIndex.BlackKing]
    const enemyColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE
    const indexes = this.bitScan(king)

    const index = indexes[0] //since there is only one king
    return this.isSquareAttacked(index, enemyColor)
  }


  private generateAllPseudoLegalMoves(color: PieceColor): Array<Move> {
    const moves: Array<Move> = [];

    const isWhite = color === PieceColor.WHITE;

    // Map piece index to generator and type
    // Maybe this approach can be changed in future but for now it works
    const pieceInfo = [
      { type: PieceType.PAWN,     index: isWhite ? BitboardIndex.WhitePawns   : BitboardIndex.BlackPawns,   gen: this.generatePawnMoves.bind(this) },
      { type: PieceType.ROOK,     index: isWhite ? BitboardIndex.WhiteRooks   : BitboardIndex.BlackRooks,   gen: this.generateRookMoves.bind(this) },
      { type: PieceType.KNIGHT,   index: isWhite ? BitboardIndex.WhiteKnights : BitboardIndex.BlackKnights, gen: this.generateKnightMoves.bind(this) },
      { type: PieceType.BISHOP,   index: isWhite ? BitboardIndex.WhiteBishops : BitboardIndex.BlackBishops, gen: this.generateBishopMoves.bind(this) },
      { type: PieceType.QUEEN,    index: isWhite ? BitboardIndex.WhiteQueen   : BitboardIndex.BlackQueen,   gen: this.generateQueenMoves.bind(this) },
      { type: PieceType.KING,     index: isWhite ? BitboardIndex.WhiteKing    : BitboardIndex.BlackKing,    gen: this.generateKingAttacks.bind(this) },
    ];

    for (const { type, index, gen } of pieceInfo) {
      const bitboard = this.piecesPosition[index];

      // For each set bit (i.e. piece), get its square index
      const pieceSquares = this.bitScan(bitboard);

      for (const from of pieceSquares) {
        const possibleMoves: bigint = gen(from, color); // generates attack bitboard

        const moveTargets = this.bitScan(possibleMoves);
        for (const to of moveTargets) {
          moves.push({ from, to, type, color });
        }
      }
    }

    return moves;
  }


  private isKingCheckmate(color: PieceColor): boolean {
    const allMoves: Array<Move> = this.generateAllPseudoLegalMoves(color)
    let isCheckmate = true

    for (const move of allMoves) {
      this.simulateMove(move)
      if (!this.isInCheck(color)) {
        isCheckmate = false
        break
      }
      this.undoMove()
    }  

    this.undoMove()
    return isCheckmate
  }

  private undoMove() {
    this.piecesPosition = this.previousPiecesPosition.slice()
    this.previousPiecesPosition = this.piecesPosition.slice()
    this.blackKingMoved = this.prevBlackKingMoved
    this.whiteKingMoved = this.prevWhiteKingMoved
    this.whiteRookA1MovedOrCaptured = this.prevWhiteRookA1MovedOrCaptured
    this.whiteRookH1MovedOrCaptured = this.prevWhiteRookH1MovedOrCaptured
    this.blackRookA8MovedOrCaptured = this.prevBlackRookA8MovedOrCaptured
    this.blackRookH8MovedOrCaptured = this.prevBlackRookH8MovedOrCaptured
  }

  private simulateMove(move: Move): void {
    const {from, to, type, color} = move
    switch(type) {
      case PieceType.PAWN:
        color === PieceColor.WHITE ? this.moveWhitePawn(from, to) : this.moveBlackPawn(from, to)
        break
      
      case PieceType.ROOK:
        color === PieceColor.WHITE ? this.moveWhiteRook(from, to) : this.moveBlackRook(from, to)
        break
      
      case PieceType.BISHOP:
        color === PieceColor.WHITE ? this.moveWhiteBishop(from, to) : this.moveBlackBishop(from, to)
        break

      case PieceType.KNIGHT:
        color === PieceColor.WHITE ? this.moveWhiteKnight(from, to) : this.moveBlackKnight(from, to)
        break

      case PieceType.KING:
        color === PieceColor.WHITE ? this.moveWhiteKing(from, to) : this.moveBlackKing(from, to)
        break
      
      case PieceType.QUEEN:
        color === PieceColor.WHITE ? this.moveWhiteQueen(from, to) : this.moveBlackQueen(from, to)
        break
      
      default:
        throw new Error(`Piece ${type} not recognized`)
    }
  }

  makeMove(move: Move) {

    if(this.checkmate !== null) {
      throw new Error(`${this.checkmate} king Checkmate. Game Over!`)
    }
    // reset en passant squares before move
    move.color === PieceColor.WHITE ? this.whiteEnPassantSquares = 0n : this.blackEnPassantSquares = 0n
    this.simulateMove(move)
    const enemyColor = move.color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE


    if(this.isInCheck(move.color)) {
      this.undoMove()
      throw new Error(`King in check, try other move`)
    }

    // backup this state if move is correct
    this.previousPiecesPosition = this.piecesPosition.slice()
    this.prevBlackKingMoved = this.blackKingMoved
    this.prevWhiteKingMoved = this.whiteKingMoved
    this.prevWhiteRookA1MovedOrCaptured = this.whiteRookA1MovedOrCaptured
    this.prevWhiteRookH1MovedOrCaptured = this.whiteRookH1MovedOrCaptured
    this.prevBlackRookA8MovedOrCaptured = this.blackRookA8MovedOrCaptured
    this.prevBlackRookH8MovedOrCaptured = this.blackRookH8MovedOrCaptured

    // first check if enemy color is in check for less calcultion then check checkmate
    if(this.isInCheck(enemyColor)) {
      if(this.isKingCheckmate(enemyColor)) {
        this.checkmate = enemyColor
      }
    }
  }

  private filterValidSquaresForAPiece(type: PieceType, color: PieceColor, from: number, possibleSquares: bigint): Array<number> {
    let indexes: Array<number> = this.bitScan(possibleSquares)
    let validSquares: Array<number> = []

    for (const i of indexes) {
      let move: Move = {
        from: from,
        to: i,
        type: type,
        color: color
      }
      this.simulateMove(move)
      if(!this.isInCheck(color)) {
        validSquares.push(i)
      }
      this.undoMove()
    }

    return validSquares
  }

  // Generate Valid For Frontend
  getValidSquaresForFrontend(piecePos: number, type: PieceType, color: PieceColor): ValidMoves {
    let possibleSquares: bigint = 0n
    let enemySquares: bigint = color === PieceColor.WHITE ? u64_or(this.blackOccupiedSquares(), this.blackEnPassantSquares) : 
                                                            u64_or(this.whiteOccupiedSquares(), this.whiteEnPassantSquares)
    let castlingMoves: Array<number> = []
    switch(type) {
      case PieceType.PAWN:
        possibleSquares = this.generatePawnMoves(piecePos, color)
        break
      case PieceType.ROOK:
        possibleSquares = this.generateRookMoves(piecePos, color)
        break
      case PieceType.BISHOP:
        possibleSquares = this.generateBishopMoves(piecePos, color)
        break
      case PieceType.KNIGHT:
        possibleSquares = this.generateKnightMoves(piecePos, color)
        break
      case PieceType.QUEEN:
        possibleSquares = this.generateQueenMoves(piecePos, color)
        break
      case PieceType.KING:
        possibleSquares = this.generateKingAttacks(piecePos, color)
        castlingMoves = this.bitScan(this.generateCastlingMoves(color))
        break
      default:
        throw new Error(`Piece ${type} not recognized`)
    }

    let captureSquares: bigint = u64_and(possibleSquares, enemySquares)
    let normalSquares: bigint = u64_and(u64_not(enemySquares), possibleSquares)
    const normalMoves: Array<number> = this.filterValidSquaresForAPiece(type, color, piecePos, normalSquares)
    const captureMoves: Array<number> = this.filterValidSquaresForAPiece(type, color, piecePos, captureSquares)
    normalMoves.push(...castlingMoves)

    return {
      normalMoves: normalMoves,
      captureMoves: captureMoves
    }
  }

  canPawnPromote(color: PieceColor): boolean {
    const rank8Mask: bigint = 0xFF00000000000000n
    const rank1Mask: bigint = 0x00000000000000FFn

    const val: bigint = color === PieceColor.WHITE ? u64_and(rank8Mask, this.piecesPosition[BitboardIndex.WhitePawns]) : 
                                                      u64_and(rank1Mask, this.piecesPosition[BitboardIndex.BlackPawns])

    return val !== 0n                         
  }

  getCheckmate(): PieceColor | null {
    return this.checkmate
  }

  initializeBitBoard(state: BitBoardState) {
    this.piecesPosition = decodeBigUint64Array(state.piecesPosition)

    this.blackKingMoved = state.blackKingMoved
    this.whiteKingMoved = state.whiteKingMoved
    this.whiteRookA1MovedOrCaptured = state.whiteRookA1MovedOrCaptured
    this.whiteRookH1MovedOrCaptured = state.whiteRookH1MovedOrCaptured
    this.blackRookA8MovedOrCaptured = state.blackRookA8MovedOrCaptured
    this.blackRookH8MovedOrCaptured = state.blackRookH8MovedOrCaptured

    this.whiteEnPassantSquares = decodeBigUint64(state.whiteEnPassantSquares)
    this.blackEnPassantSquares = decodeBigUint64(state.blackEnPassantSquares)

    this.checkmate = state.checkmate

    // for previous positions

    this.previousPiecesPosition = decodeBigUint64Array(state.prevPiecesPosition)
    
    this.prevBlackKingMoved = state.prevBlackKingMoved
    this.prevWhiteKingMoved = state.prevWhiteKingMoved
    this.prevWhiteRookA1MovedOrCaptured = state.prevWhiteRookA1MovedOrCaptured
    this.prevWhiteRookH1MovedOrCaptured = state.prevWhiteRookH1MovedOrCaptured
    this.prevBlackRookA8MovedOrCaptured = state.prevBlackRookA8MovedOrCaptured
    this.prevBlackRookH8MovedOrCaptured = state.prevBlackRookH8MovedOrCaptured
  }

  searializeStateForRedis(): BitBoardState {
    return {
      piecesPosition: encodeBigUint64Array(this.piecesPosition),
      whiteKingMoved: this.whiteKingMoved,
      blackKingMoved: this.blackKingMoved,
      whiteRookA1MovedOrCaptured: this.whiteRookA1MovedOrCaptured,
      whiteRookH1MovedOrCaptured: this.whiteRookH1MovedOrCaptured,
      blackRookA8MovedOrCaptured: this.blackRookA8MovedOrCaptured,
      blackRookH8MovedOrCaptured: this.blackRookH8MovedOrCaptured,
      whiteEnPassantSquares: encodeBigUint64(this.whiteEnPassantSquares),
      blackEnPassantSquares: encodeBigUint64(this.blackEnPassantSquares),
      checkmate: this.checkmate,

      prevPiecesPosition: encodeBigUint64Array(this.piecesPosition),
      prevWhiteKingMoved: this.prevWhiteKingMoved,
      prevBlackKingMoved: this.prevBlackKingMoved,
      prevWhiteRookA1MovedOrCaptured: this.prevWhiteRookA1MovedOrCaptured,
      prevWhiteRookH1MovedOrCaptured: this.prevWhiteRookH1MovedOrCaptured,
      prevBlackRookA8MovedOrCaptured: this.prevBlackRookA8MovedOrCaptured,
      prevBlackRookH8MovedOrCaptured: this.prevBlackRookH8MovedOrCaptured,
    }

  }
}
