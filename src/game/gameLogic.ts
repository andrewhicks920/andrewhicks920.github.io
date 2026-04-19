import { type Cell, type Color, type Position } from './types';
import { samePos, applyMove } from './board';
import { getValidMoves } from './pieces';

function findKing(cells: Cell[], color: Color): Position | null {
    const cell = cells.find(c => c.piece?.type === 'king' && c.piece.color === color);
    return cell ? { q: cell.q, r: cell.r } : null;
}

/** True if `color`'s king is attacked by any opponent pseudo-legal move. */
export function isInCheck(cells: Cell[], color: Color): boolean {
    const kingPos = findKing(cells, color);
    if (!kingPos) return false;

    const opponent: Color = color === 'white' ? 'black' : 'white';
    for (const cell of cells) {
        if (cell.piece?.color !== opponent) continue;
        // En passant never threatens a king, so null is safe here.
        const moves = getValidMoves(cells, { q: cell.q, r: cell.r }, null);
        if (moves.some(m => samePos(m, kingPos))) return true;
    }
    return false;
}

/** Legal moves for the piece at `pos` — pseudo-legal filtered by king safety. */
export function getLegalMoves(
    cells: Cell[],
    pos: Position,
    enPassantTarget: Position | null,
): Position[] {
    const cell = cells.find(c => samePos(c, pos));
    if (!cell?.piece) return [];

    const { color } = cell.piece;
    return getValidMoves(cells, pos, enPassantTarget).filter(to => {
        const after = applyMove(cells, pos, to, enPassantTarget, color);
        return !isInCheck(after, color);
    });
}

/** True if `color` has at least one legal move available. */
export function hasAnyLegalMove(
    cells: Cell[],
    color: Color,
    enPassantTarget: Position | null,
): boolean {
    for (const cell of cells) {
        if (cell.piece?.color !== color) continue;
        if (getLegalMoves(cells, { q: cell.q, r: cell.r }, enPassantTarget).length > 0)
            return true;
    }
    return false;
}

export function getGameStatus(
    cells: Cell[],
    currentTurn: Color,
    enPassantTarget: Position | null,
): 'playing' | 'check' | 'checkmate' | 'stalemate' {
    const inCheck = isInCheck(cells, currentTurn);
    if (!hasAnyLegalMove(cells, currentTurn, enPassantTarget))
        return inCheck ? 'checkmate' : 'stalemate';
    return inCheck ? 'check' : 'playing';
}

/**
 * True when a pawn has reached the furthest reachable rank for its file.
 * White promotes at r = min(5, 5−q); Black at r = max(−5, −5−q).
 */
export function isPromotionSquare(q: number, r: number, color: Color): boolean {
    if (color === 'white') return r === Math.min(5, 5 - q);
    return r === Math.max(-5, -5 - q);
}
