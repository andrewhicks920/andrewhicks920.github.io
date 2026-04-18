import { type Cell, type Color, type Position } from './types';
import { isValidCell } from './board';

// Rook — slides along 3 axes (6 directions)
const ROOK_DIRS: [number, number][] = [
    [ 0,  1], [ 0, -1],  // along r
    [ 1,  0], [-1,  0],  // along q
    [ 1, -1], [-1,  1],  // along s (−q−r)
];

// Bishop — slides through shared vertices (6 directions)
const BISHOP_DIRS: [number, number][] = [
    [ 1,  1], [-1, -1],
    [ 2, -1], [-2,  1],
    [ 1, -2], [-1,  2],
];

// Knight — 12 fixed jumps (1 rook step + 1 bishop step, non-parallel axis)
const KNIGHT_MOVES: [number, number][] = [
    [ 3, -1], [-3,  1],
    [ 2,  1], [-2, -1],
    [ 1,  2], [-1, -2],
    [-1,  3], [ 1, -3],
    [ 3, -2], [-3,  2],
    [ 2, -3], [-2,  3],
];

const KING_DIRS: [number, number][] = [...ROOK_DIRS, ...BISHOP_DIRS];

function cellAt(cells: Cell[], q: number, r: number): Cell | undefined {
    return cells.find(c => c.q === q && c.r === r);
}

// Walk one ray until the board edge, a friendly piece, or a capture.
function slide(cells: Cell[], from: Position, dq: number, dr: number, color: Color,): Position[] {
    const moves: Position[] = [];
    let q = from.q + dq;
    let r = from.r + dr;

    while (isValidCell(q, r)) {
        const occupant = cellAt(cells, q, r)?.piece;
        if (occupant) {
            if (occupant.color !== color)
                moves.push({ q, r }); // capture

            break;
        }

        moves.push({ q, r });
        q += dq;
        r += dr;
    }

    return moves;
}

function rookMoves(cells: Cell[], pos: Position, color: Color): Position[] {
    return ROOK_DIRS.flatMap(([dq, dr]) => slide(cells, pos, dq, dr, color));
}

function bishopMoves(cells: Cell[], pos: Position, color: Color): Position[] {
    return BISHOP_DIRS.flatMap(([dq, dr]) => slide(cells, pos, dq, dr, color));
}

function queenMoves(cells: Cell[], pos: Position, color: Color): Position[] {
    return [
        ...ROOK_DIRS.flatMap(([dq, dr]) => slide(cells, pos, dq, dr, color)),
        ...BISHOP_DIRS.flatMap(([dq, dr]) => slide(cells, pos, dq, dr, color)),
    ];
}

function kingMoves(cells: Cell[], pos: Position, color: Color): Position[] {
    const moves: Position[] = [];
    for (const [dq, dr] of KING_DIRS) {
        const q = pos.q + dq;
        const r = pos.r + dr;
        if (!isValidCell(q, r)) continue;
        const occupant = cellAt(cells, q, r)?.piece;
        if (occupant?.color === color) continue; // own piece blocks
        moves.push({ q, r });
    }
    return moves;
}

function knightMoves(cells: Cell[], pos: Position, color: Color): Position[] {
    const moves: Position[] = [];
    for (const [dq, dr] of KNIGHT_MOVES) {
        const q = pos.q + dq;
        const r = pos.r + dr;
        if (!isValidCell(q, r)) continue;
        const occupant = cellAt(cells, q, r)?.piece;
        if (occupant?.color === color) continue;
        moves.push({ q, r });
    }
    return moves;
}

// White moves visually upward: straight (0,+1), captures (+1,0) and (−1,+1)
// Black moves visually downward: straight (0,−1), captures (−1,0) and (+1,−1)
function pawnMoves(
    cells: Cell[],
    pos: Position,
    color: Color,
    enPassantTarget: Position | null,
): Position[] {
    const moves: Position[] = [];
    const { q, r } = pos;
    const dr = color === 'white' ? 1 : -1;

    // Straight — non-capturing
    const oneAhead = cellAt(cells, q, r + dr);
    if (oneAhead && !oneAhead.piece) {
        moves.push({ q, r: r + dr });

        if (isOnStartingRank(q, r, color)) {
            const twoAhead = cellAt(cells, q, r + 2 * dr);
            if (twoAhead && !twoAhead.piece)
                moves.push({ q, r: r + 2 * dr });
        }
    }

    // Diagonal captures
    const captureDirs: [number, number][] =
        color === 'white'
            ? [[ 1,  0], [-1,  1]]
            : [[-1,  0], [ 1, -1]];

    for (const [dq, dCapR] of captureDirs) {
        const tq = q + dq;
        const tr = r + dCapR;
        if (!isValidCell(tq, tr)) continue;

        const target = cellAt(cells, tq, tr);
        const isEnPassant = enPassantTarget?.q === tq && enPassantTarget?.r === tr;

        if ((target?.piece && target.piece.color !== color) || isEnPassant)
            moves.push({ q: tq, r: tr });
    }

    return moves;
}

// White starting r: −(max(q,0) + 1)  →  verified against all 9 pawn positions ✓
// Black starting r:  max(1 − q, 1)   →  verified against all 9 pawn positions ✓
function isOnStartingRank(q: number, r: number, color: Color): boolean {
    if (color === 'white') return r === -(Math.max(q, 0) + 1);
    return r === Math.max(1 - q, 1);
}

/**
 * Returns all pseudo-legal moves for the piece at `pos`.
 * Does NOT filter moves that leave the king in check — that comes next.
 */
export function getValidMoves(cells: Cell[], pos: Position, enPassantTarget: Position | null = null,): Position[] {
    const cell = cellAt(cells, pos.q, pos.r);

    if (!cell?.piece)
        return [];

    const { type, color } = cell.piece;

    switch (type) {
        case 'rook':   return rookMoves(cells, pos, color);
        case 'bishop': return bishopMoves(cells, pos, color);
        case 'queen':  return queenMoves(cells, pos, color);
        case 'king':   return kingMoves(cells, pos, color);
        case 'knight': return knightMoves(cells, pos, color);
        case 'pawn':   return pawnMoves(cells, pos, color, enPassantTarget);
    }
}