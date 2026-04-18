/**
 * HEXAGONAL COORDINATE SYSTEM (AXIAL)
 *
 * We use 'q' and 'r' to represent our hex grid, which is essentially
 * a skewed square grid. This is standard for hexagonal math.
 *
 * - q (Column): The horizontal axis. q=-5 is file 'a', q=+5 is file 'l'.
 * - r (Row): The diagonal axis (60° from q).
 *
 * MATH CONSTANT:
 * In a hex grid, there is an implicit third coordinate 's' where:
 * q + r + s = 0. We only store q and r because s = -q - r.
 *
 * COORDINATE DIRECTIONS:
 * - Orthogonal (Rook-like): Move through a shared edge (+q, +r, or +s).
 * - Diagonal (Bishop-like): Move through a shared vertex (two coords change).
 */

export type Color = 'white' | 'black';
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type CellColor = 'light' | 'mid' | 'dark'; // Visual color of a hex cell — 3 colors so bishops stay on 1 color

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Position {
  q: number;
  r: number;
}

export interface Cell {
  q: number;
  r: number;
  cellColor: CellColor; // visual color of the hex tile
  piece: Piece | null;  // which piece sits here, or null if empty
}

export interface GameState {

  cells: Cell[];
  currentTurn: Color;
  selectedPos: Position | null;    // which cell the current player clicked
  validMoves: Position[];          // highlighted destinations for selected piece
  enPassantTarget: Position | null;
  gameStatus: 'playing' | 'check' | 'checkmate' | 'stalemate';
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  promotionPending: Position | null; // pawn waiting for promotion choice
}