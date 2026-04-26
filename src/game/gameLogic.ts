import { type Cell, type Color, type Position, oppositeColor } from './types';
import { samePos, applyMove, buildCellMap, isValidCell } from './board';
import { getPseudoLegalMoves, ROOK_DIRS, BISHOP_DIRS, KNIGHT_MOVES, KING_DIRS } from './pieces';

/** Returns the position of `color`'s king, or `null` if the king is not on the board. */
function findKing(cells: Cell[], color: Color): Position | null {
    const cell = cells.find(c => c.piece?.type === 'king' && c.piece.color === color);
    return cell ? { q: cell.q, r: cell.r } : null;
}

/**
 * True if `color`'s king is attacked by any opponent piece.
 *
 * Uses a reverse-lookup (ray-cast outward from the king) instead of generating
 * every opponent move, reducing work from O(pieces × board) to O(board_rays).
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
 * Filters pseudo-legal moves by simulating each one and rejecting any that leave `color`'s king in check.
 *
 * @param enPassantTarget - Landing square for a possible en-passant capture, or `null`.
 */
export function getLegalMoves(cells: Cell[], pos: Position, enPassantTarget: Position | null,): Position[] {
    const cell = cells.find(c => samePos(c, pos));
    if (!cell?.piece) return [];

    const { color } = cell.piece;
    return getPseudoLegalMoves(cells, pos, enPassantTarget).filter(to => {
        const after = applyMove(cells, pos, to, enPassantTarget, color);
        return !isInCheck(after, color);
    });
}

/**
 * Returns `true` if `color` has at least one legal move available.
 * Used to distinguish checkmate from stalemate.
 */
export function hasAnyLegalMove(cells: Cell[], color: Color, enPassantTarget: Position | null,): boolean {
    for (const cell of cells) {
        if (cell.piece?.color !== color) continue;
        if (getLegalMoves(cells, { q: cell.q, r: cell.r }, enPassantTarget).length > 0)
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
 * True when a pawn has reached the furthest reachable rank for its file.
 * White promotes at r = min(5, 5−q); Black at r = max(−5, −5−q).
 */
export function isPromotionSquare(q: number, r: number, color: Color): boolean {
    if (color === 'white') return r === Math.min(5, 5 - q);
    return r === Math.max(-5, -5 - q);
}
