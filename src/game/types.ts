/**
 * HEXAGONAL COORDINATE SYSTEM (AXIAL)
 *
 * We use 'q' and 'r' to represent our hex grid, which is essentially
 * a skewed square grid.
 *
 * q (Column): The horizontal axis. q=-5 is file 'a', q=+5 is file 'l'.
 * r (Row): The diagonal axis (60° from q).
 *
 * MATH CONSTANT:
 * In a hex grid, there is an implicit third coordinate 's' where:
 * q + r + s = 0. We only store q and r because s = -q - r.
 *
 * COORDINATE DIRECTIONS:
 * Orthogonal (Rook-like): Move through a shared edge (+q, +r, or +s).
 * Diagonal (Bishop-like): Move through a shared vertex (two coords change).
 */

/** Side that owns a piece or takes a turn. */
export type Color = 'white' | 'black';

/** All piece types present in Glinski's hexagonal chess. */
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

/**
 * Visual shading of a hex tile.
 * Determined by `(q − r) mod 3` so that bishops are always confined to one shade.
 */
export type CellColor = 'light' | 'mid' | 'dark';

/** A chess piece with its type and owning side. */
export interface Piece {
  type: PieceType;
  color: Color;
}

/**
 * Axial coordinates on the hex grid.
 * The implicit third cube coordinate is `s = −q − r`.
 */
export interface Position {
  q: number;
  r: number;
}

/** A single hex tile: its grid coordinates, visual shading, and optional occupant. */
export interface Cell {
  q: number;
  r: number;
  /** Visual shading of the hex tile. */
  cellColor: CellColor;
  /** Piece occupying this cell, or `null` if empty. */
  piece: Piece | null;
}

/**
 * All possible game status values, including draw by fifty-move rule or threefold repetition.
 * `'draw'` is distinct from `'stalemate'` (Glinski's stalemate awards ¾ point, not ½).
 */
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

/** One entry in the move history list, pairing white and black half-moves by move number. */
export interface MoveRecord {
  moveNumber: number;
  white?: string;
  black?: string;
}

/**
 * Returns the opponent of `color`.
 *
 * @param color - The side whose opponent is needed.
 * @returns `'black'` when given `'white'`, and vice versa.
 */
export function oppositeColor(color: Color): Color {
    return color === 'white' ? 'black' : 'white';
}