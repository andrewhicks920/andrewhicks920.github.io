import {type Cell, type Color, type Position} from './types';
import {buildCellMap, isValidCell} from './board';

/** Six orthogonal directions for a rook — one per shared hex edge, along the q, r, and s axes. */
export const ROOK_DIRS: [number, number][] = [
    [ 0,  1], [ 0, -1],  // along r
    [ 1,  0], [-1,  0],  // along q
    [ 1, -1], [-1,  1],  // along s (−q−r)
];

/** Six diagonal directions for a bishop — through shared hex vertices (two cube coords change). */
export const BISHOP_DIRS: [number, number][] = [
    [ 1,  1], [-1, -1],
    [ 2, -1], [-2,  1],
    [ 1, -2], [-1,  2],
];

/**
 * 12 fixed knight jumps: one rook step followed by one bishop step on a non-parallel axis.
 * Glinski's hex knight has 12 possible destinations (vs. 8 on a square board).
 */
export const KNIGHT_MOVES: [number, number][] = [
    [ 3, -1], [-3,  1],
    [ 2,  1], [-2, -1],
    [ 1,  2], [-1, -2],
    [-1,  3], [ 1, -3],
    [ 3, -2], [-3,  2],
    [ 2, -3], [-2,  3],
];

/** All 12 adjacent directions for a king — union of rook and bishop directions. */
export const KING_DIRS: [number, number][] = [...ROOK_DIRS, ...BISHOP_DIRS];

/** Retrieves a cell from a pre-built map by its axial coordinates. */
function cellAt(cellMap: Map<string, Cell>, q: number, r: number): Cell | undefined {
    return cellMap.get(`${q},${r}`);
}

/**
 * Walks one ray in direction `(deltaQ, deltaR)` from `from`, collecting squares until
 * the board edge, a friendly piece (exclusive), or an enemy piece (inclusive capture).
 */
function slide(cellMap: Map<string, Cell>, from: Position, deltaQ: number, deltaR: number, color: Color): Position[] {
    const moves: Position[] = [];
    let q = from.q + deltaQ;
    let r = from.r + deltaR;

    while (isValidCell(q, r)) {
        const occupant = cellAt(cellMap, q, r)?.piece;
        if (occupant) {
            if (occupant.color !== color)
                moves.push({ q, r }); // capture

            break;
        }

        moves.push({ q, r });
        q += deltaQ;
        r += deltaR;
    }

    return moves;
}

/** All squares reachable by a rook at `pos` (slides along the three orthogonal axes). */
function rookMoves(cellMap: Map<string, Cell>, pos: Position, color: Color): Position[] {
    return ROOK_DIRS.flatMap(([deltaQ, deltaR]) => slide(cellMap, pos, deltaQ, deltaR, color));
}

/** All squares reachable by a bishop at `pos` (slides along the six diagonal axes). */
function bishopMoves(cellMap: Map<string, Cell>, pos: Position, color: Color): Position[] {
    return BISHOP_DIRS.flatMap(([deltaQ, deltaR]) => slide(cellMap, pos, deltaQ, deltaR, color));
}

/** All squares reachable by a queen at `pos` (union of rook and bishop moves). */
function queenMoves(cellMap: Map<string, Cell>, pos: Position, color: Color): Position[] {
    return [...rookMoves(cellMap, pos, color), ...bishopMoves(cellMap, pos, color)];
}

/** All squares reachable by a king at `pos` (one step in any of the 12 adjacent directions). */
function kingMoves(cellMap: Map<string, Cell>, pos: Position, color: Color): Position[] {
    const moves: Position[] = [];
    for (const [deltaQ, deltaR] of KING_DIRS) {
        const q = pos.q + deltaQ;
        const r = pos.r + deltaR;
        if (!isValidCell(q, r)) continue;
        const occupant = cellAt(cellMap, q, r)?.piece;
        if (occupant?.color === color) continue; // own piece blocks
        moves.push({ q, r });
    }
    return moves;
}

/** All squares reachable by a knight at `pos` (12 fixed L-shaped jumps). */
function knightMoves(cellMap: Map<string, Cell>, pos: Position, color: Color): Position[] {
    const moves: Position[] = [];
    for (const [deltaQ, deltaR] of KNIGHT_MOVES) {
        const q = pos.q + deltaQ;
        const r = pos.r + deltaR;
        if (!isValidCell(q, r)) continue;
        const occupant = cellAt(cellMap, q, r)?.piece;
        if (occupant?.color === color) continue;
        moves.push({ q, r });
    }
    return moves;
}

/**
 * All squares reachable by a pawn at `pos`, including en-passant captures.
 *
 * White moves upward: pushes along `(0,+1)`, captures along `(+1,0)` and `(−1,+1)`.
 * Black moves downward: pushes along `(0,−1)`, captures along `(−1,0)` and `(+1,−1)`.
 * A double-push is allowed only from the pawn's starting rank.
 *
 * @param enPassantTarget - The square a capturing pawn would land on, or `null`.
 */
function pawnMoves(cellMap: Map<string, Cell>, pos: Position, color: Color, enPassantTarget: Position | null): Position[] {
    const moves: Position[] = [];
    const { q, r } = pos;
    const forward = color === 'white' ? 1 : -1;

    // Straight — non-capturing
    const oneAhead = cellAt(cellMap, q, r + forward);
    if (oneAhead && !oneAhead.piece) {
        moves.push({ q, r: r + forward });

        if (isOnStartingRank(q, r, color)) {
            const twoAhead = cellAt(cellMap, q, r + 2 * forward);
            if (twoAhead && !twoAhead.piece)
                moves.push({ q, r: r + 2 * forward });
        }
    }

    // Diagonal captures
    const captureDirs: [number, number][] =
        color === 'white'
            ? [[ 1,  0], [-1,  1]]
            : [[-1,  0], [ 1, -1]];

    for (const [deltaQ, dCapR] of captureDirs) {
        const tq = q + deltaQ;
        const tr = r + dCapR;
        if (!isValidCell(tq, tr)) continue;

        const target = cellAt(cellMap, tq, tr);
        const isEnPassant = enPassantTarget?.q === tq && enPassantTarget?.r === tr;

        if ((target?.piece && target.piece.color !== color) || isEnPassant)
            moves.push({ q: tq, r: tr });
    }

    return moves;
}

/**
 * Returns `true` when the pawn at `(q, r)` is on its starting rank and eligible for a double-push.
 *
 * White starting r: `−(max(q, 0) + 1)` — verified against all 9 pawn starting positions.
 * Black starting r: `max(1 − q, 1)`    — verified against all 9 pawn starting positions.
 */
function isOnStartingRank(q: number, r: number, color: Color): boolean {
    if (color === 'white') return r === -(Math.max(q, 0) + 1);
    return r === Math.max(1 - q, 1);
}


/**
 * Returns all pseudo-legal moves for the piece at `pos`.
 * Does NOT filter moves that leave the king in check — that comes next.
 */
export function getPseudoLegalMoves(cells: Cell[], pos: Position, enPassantTarget: Position | null = null): Position[] {
    // Build once so every cellAt lookup below is O(1) instead of O(n).
    const cellMap = buildCellMap(cells);
    const cell = cellAt(cellMap, pos.q, pos.r);

    if (!cell?.piece)
        return [];

    const { type, color } = cell.piece;

    switch (type) {
        case 'rook':   return rookMoves(cellMap, pos, color);
        case 'bishop': return bishopMoves(cellMap, pos, color);
        case 'queen':  return queenMoves(cellMap, pos, color);
        case 'king':   return kingMoves(cellMap, pos, color);
        case 'knight': return knightMoves(cellMap, pos, color);
        case 'pawn':   return pawnMoves(cellMap, pos, color, enPassantTarget);

        default: throw new Error(`Unhandled piece type: ${type}`);
    }
}