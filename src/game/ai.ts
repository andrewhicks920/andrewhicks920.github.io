import { type Cell, type Color, type Position, type PieceType, oppositeColor } from './types';
import { getLegalMoves, getGameStatus, isPromotionSquare } from './gameLogic';
import { applyMove, computeEnPassantTarget } from './board';

/** Bot difficulty level, mapped to minimax search depth. */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Static piece values (in pawn units) used by the evaluation function.
 * King's value is deliberately large to dominate the score in checkmate positions.
 */
const PIECE_VALUES: Record<PieceType, number> = {
    pawn: 1,
    knight: 3,
    bishop: 3.5,
    rook: 5,
    queen: 9,
    king: 100,
};

/** A from–to pair representing a single half-move. */
interface Move {
    from: Position;
    to: Position;
}

/**
 * Static material evaluation relative to `color`.
 * Returns the sum of `color`'s piece values minus the opponent's.
 */
function evaluate(cells: Cell[], color: Color): number {
    let score = 0;
    for (const cell of cells) {
        if (!cell.piece) continue;
        const value = PIECE_VALUES[cell.piece.type];
        score += cell.piece.color === color ? value : -value;
    }
    return score;
}

/** Thin wrapper so minimax call sites stay readable. */
function newEnPassant(cells: Cell[], move: Move): Position | null {
    const piece = cells.find(c => c.q === move.from.q && c.r === move.from.r)?.piece;
    return computeEnPassantTarget(move.from, move.to, piece);
}

/** applyMove + auto-promote to queen so minimax evaluates the correct piece. */
function simulateMove(cells: Cell[], move: Move, enPassantTarget: Position | null, color: Color): Cell[] {
    const next = applyMove(cells, move.from, move.to, enPassantTarget, color);
    const piece = cells.find(c => c.q === move.from.q && c.r === move.from.r)?.piece;

    if (piece?.type === 'pawn' && isPromotionSquare(move.to.q, move.to.r, color)) {
        return next.map(cell =>
            cell.q === move.to.q && cell.r === move.to.r
                ? { ...cell, piece: { type: 'queen', color } }
                : cell,
        );
    }
    return next;
}

/** Returns every legal move available to `color` in the given position. */
function getAllMoves(cells: Cell[], color: Color, enPassantTarget: Position | null): Move[] {
    const moves: Move[] = [];
    for (const cell of cells) {
        if (cell.piece?.color !== color) continue;
        const from: Position = { q: cell.q, r: cell.r };
        for (const to of getLegalMoves(cells, from, enPassantTarget)) {
            moves.push({ from, to });
        }
    }
    return moves;
}

/**
 * Alpha-beta minimax search.
 *
 * @param cells - Board state at this node of the search tree.
 * @param depth - Remaining plies to search; returns the static evaluation at 0.
 * @param alpha - Lower bound for the maximizing player (best already found).
 * @param beta  - Upper bound for the minimizing player (best already found).
 * @param maximizing - `true` when it is the bot's turn to move.
 * @param botColor - The side the bot is playing; scores are always relative to this color.
 * @param enPassantTarget - En-passant target square available to the side to move at this node, or `null`.
 * @returns The heuristic value of `cells` from `botColor`'s perspective.
 */
function minimax(
    cells: Cell[],
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    botColor: Color,
    enPassantTarget: Position | null,
): number {
    const sideToMove: Color = maximizing ? botColor : oppositeColor(botColor);
    const status = getGameStatus(cells, sideToMove, enPassantTarget);

    if (status === 'checkmate') return maximizing ? -10_000 : 10_000;
    if (status === 'stalemate') return maximizing ? -7500 : 7500; // Stalemate return 3/4 of a point to the 'winner'
    if (depth === 0) return evaluate(cells, botColor);

    const moves = getAllMoves(cells, sideToMove, enPassantTarget);

    if (maximizing) {
        let best = -Infinity;
        for (const move of moves) {
            const next = simulateMove(cells, move, enPassantTarget, sideToMove);
            const score = minimax(next, depth - 1, alpha, beta, false, botColor, newEnPassant(cells, move));
            best = Math.max(best, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return best;
    }
    else {
        let best = Infinity;
        for (const move of moves) {
            const next = simulateMove(cells, move, enPassantTarget, sideToMove);
            const score = minimax(next, depth - 1, alpha, beta, true, botColor, newEnPassant(cells, move));
            best = Math.min(best, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return best;
    }
}

/** Minimax search depth for each difficulty level. */
const DEPTH: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

/**
 * Selects the best move for the bot using alpha-beta minimax.
 * On `'easy'` difficulty a random legal move is returned instead of a search.
 *
 * @returns The chosen `Move`, or `null` if the bot has no legal moves.
 */
export function getBotMove(cells: Cell[], botColor: Color, enPassantTarget: Position | null, difficulty: Difficulty,): Move | null {
    const moves = getAllMoves(cells, botColor, enPassantTarget);
    if (moves.length === 0) return null;

    if (difficulty === 'easy')
        return moves[Math.floor(Math.random() * moves.length)];

    const depth = DEPTH[difficulty];
    let bestMove: Move | null = null;
    let bestScore = -Infinity;

    for (const move of moves) {
        const next = simulateMove(cells, move, enPassantTarget, botColor);
        const score = minimax(next, depth - 1, -Infinity, Infinity, false, botColor, newEnPassant(cells, move));
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}
