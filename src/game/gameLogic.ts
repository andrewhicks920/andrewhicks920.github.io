import { type Cell, type Color, type Position, oppositeColor } from './types';
import { applyMove, buildCellMap, isValidCell, posKey } from './board';
import { getPseudoLegalMoves, ROOK_DIRS, BISHOP_DIRS, KNIGHT_MOVES, KING_DIRS } from './pieces';

/**
 * Returns the position of `color`'s king, or `null` if the king is not on the board.
 *
 * @param cells - Current board state.
 * @param color - Side whose king to locate.
 * @returns The king's `Position`, or `null` if absent (should not occur in a valid game).
 */
function findKing(cells: Cell[], color: Color): Position | null {
    const cell = cells.find(c => c.piece?.type === 'king' && c.piece.color === color);
    return cell ? { q: cell.q, r: cell.r } : null;
}

/**
 * Returns `true` if `color`'s king is attacked by any opponent piece.
 *
 * Uses a reverse-lookup (ray-cast outward from the king) instead of generating
 * every opponent move, reducing work from O(pieces × board) to O(board_rays).
 *
 * @param cells - Current board state.
 * @param color - The side whose king is being tested for check.
 * @returns `true` if the king is under attack; `false` otherwise (including if no king exists).
 */
export function isInCheck(cells: Cell[], color: Color): boolean {
    const kingPos = findKing(cells, color);
    if (!kingPos) return false;

    const { q, r } = kingPos;
    const opponent = oppositeColor(color);
    const cellMap = buildCellMap(cells);

    // Sliding attacks along rook directions (rook or queen)
    for (const [dq, dr] of ROOK_DIRS) {
        let cq = q + dq, cr = r + dr;
        while (isValidCell(cq, cr)) {
            const piece = cellMap.get(`${cq},${cr}`)?.piece;
            if (piece) {
                if (piece.color === opponent && (piece.type === 'rook' || piece.type === 'queen'))
                    return true;
                break; // own piece or wrong opponent piece blocks the ray
            }
            cq += dq; cr += dr;
        }
    }

    // Sliding attacks along bishop directions (bishop or queen)
    for (const [dq, dr] of BISHOP_DIRS) {
        let cq = q + dq, cr = r + dr;
        while (isValidCell(cq, cr)) {
            const piece = cellMap.get(`${cq},${cr}`)?.piece;
            if (piece) {
                if (piece.color === opponent && (piece.type === 'bishop' || piece.type === 'queen'))
                    return true;
                break;
            }
            cq += dq; cr += dr;
        }
    }

    // Knight jumps
    for (const [dq, dr] of KNIGHT_MOVES) {
        const piece = cellMap.get(`${q + dq},${r + dr}`)?.piece;
        if (piece?.color === opponent && piece.type === 'knight') return true;
    }

    // Adjacent king (prevents moving into the opponent king's zone)
    for (const [dq, dr] of KING_DIRS) {
        const piece = cellMap.get(`${q + dq},${r + dr}`)?.piece;
        if (piece?.color === opponent && piece.type === 'king') return true;
    }

    // Pawn attacks
    // A pawn of 'opponent' color at an attacker square can capture the king.
    // White pawn captures: (+1,0) and (−1,+1) → attacker is at (q−1,r) or (q+1,r−1)
    // Black pawn captures: (−1,0) and (+1,−1) → attacker is at (q+1,r) or (q−1,r+1)
    const pawnAttackerDirs: [number, number][] = opponent === 'white'
        ? [[-1, 0], [1, -1]]
        : [[ 1, 0], [-1,  1]];

    for (const [dq, dr] of pawnAttackerDirs) {
        const piece = cellMap.get(`${q + dq},${r + dr}`)?.piece;
        if (piece?.color === opponent && piece.type === 'pawn') return true;
    }

    return false;
}

/**
 * Returns all fully legal moves for the piece at `pos`.
 * Filters pseudo-legal moves by simulating each one and rejecting any that leave the king in check.
 *
 * @param cells - Current board state.
 * @param pos - Position of the piece to move.
 * @param enPassantTarget - Landing square for a possible en-passant capture, or `null`.
 * @param cellMap - Optional pre-built O(1) lookup map; built from `cells` when omitted.
 *   Pass this from an outer call site (e.g. {@link hasAnyLegalMove}, the AI's move loop)
 *   to avoid building a new map for every piece.
 * @returns All destinations the piece can legally move to this turn.
 */
export function getLegalMoves(cells: Cell[], pos: Position, enPassantTarget: Position | null, cellMap?: Map<string, Cell>): Position[] {
    const map = cellMap ?? buildCellMap(cells);
    const cell = map.get(posKey(pos));
    if (!cell?.piece) return [];

    const { color } = cell.piece;
    return getPseudoLegalMoves(cells, pos, enPassantTarget, map).filter(to => {
        const after = applyMove(cells, pos, to, enPassantTarget, color);
        return !isInCheck(after, color);
    });
}

/**
 * Returns `true` if `color` has at least one legal move available.
 * Used to distinguish checkmate (in check, no moves) from stalemate (not in check, no moves).
 *
 * Builds a single `cellMap` shared across all per-piece {@link getLegalMoves} calls,
 * saving one O(91) map construction per piece.
 *
 * @param cells - Current board state.
 * @param color - The side to test for available moves.
 * @param enPassantTarget - En-passant landing square available this turn, or `null`.
 * @returns `true` if at least one legal move exists for `color`.
 */
export function hasAnyLegalMove(cells: Cell[], color: Color, enPassantTarget: Position | null): boolean {
    const cellMap = buildCellMap(cells);
    for (const cell of cells) {
        if (cell.piece?.color !== color) continue;
        if (getLegalMoves(cells, { q: cell.q, r: cell.r }, enPassantTarget, cellMap).length > 0)
            return true;
    }
    return false;
}

/**
 * Returns the game status from `currentTurn`'s perspective.
 *
 * - `'playing'`   — normal position, moves available.
 * - `'check'`     — king is attacked but the player has legal replies.
 * - `'checkmate'` — king is attacked with no legal moves.
 * - `'stalemate'` — king is not attacked but no legal moves exist.
 *
 * @param cells - Current board state.
 * @param currentTurn - The side about to move.
 * @param enPassantTarget - En-passant landing square available this turn, or `null`.
 * @returns One of `'playing'`, `'check'`, `'checkmate'`, or `'stalemate'`.
 */
export function getGameStatus(cells: Cell[],
    currentTurn: Color,
    enPassantTarget: Position | null,
): 'playing' | 'check' | 'checkmate' | 'stalemate' {
    const inCheck = isInCheck(cells, currentTurn);

    if (!hasAnyLegalMove(cells, currentTurn, enPassantTarget))
        return inCheck ? 'checkmate' : 'stalemate';

    return inCheck ? 'check' : 'playing';
}

/**
 * Returns `true` when a pawn has reached the furthest reachable rank for its file.
 * White promotes at `r = min(5, 5 − q)`; Black at `r = max(−5, −5 − q)`.
 *
 * @param q - Column coordinate of the pawn's destination.
 * @param r - Row coordinate of the pawn's destination.
 * @param color - Color of the pawn.
 * @returns `true` if the square is a promotion square for `color`.
 */
export function isPromotionSquare(q: number, r: number, color: Color): boolean {
    if (color === 'white') return r === Math.min(5, 5 - q);
    return r === Math.max(-5, -5 - q);
}
