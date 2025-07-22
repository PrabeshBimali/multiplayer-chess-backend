export enum PieceColor {
  WHITE = "white",
  BLACK = "black"
}

export enum PieceType {
  KNIGHT = "knight",
  KING = "king",
  QUEEN = "queen",
  BISHOP = "bishop",
  PAWN = "pawn",
  ROOK = "rook"
}

export enum BitboardIndex {
  WhitePawns = 0,
  BlackPawns = 1,
  WhiteKnights = 2,
  BlackKnights = 3,
  WhiteBishops = 4,
  BlackBishops = 5,
  WhiteRooks = 6,
  BlackRooks = 7,
  WhiteQueen = 8,
  BlackQueen = 9,
  WhiteKing = 10,
  BlackKing = 11,
}

export const indexToFENChar: Record<BitboardIndex, string> = {
  [BitboardIndex.WhitePawns]: 'P',
  [BitboardIndex.BlackPawns]: 'p',
  [BitboardIndex.WhiteKnights]: 'N',
  [BitboardIndex.BlackKnights]: 'n',
  [BitboardIndex.WhiteBishops]: 'B',
  [BitboardIndex.BlackBishops]: 'b',
  [BitboardIndex.WhiteRooks]: 'R',
  [BitboardIndex.BlackRooks]: 'r',
  [BitboardIndex.WhiteQueen]: 'Q',
  [BitboardIndex.BlackQueen]: 'q',
  [BitboardIndex.WhiteKing]: 'K',
  [BitboardIndex.BlackKing]: 'k',
};