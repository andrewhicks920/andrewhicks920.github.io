import { type Cell, type Color, type Position, type PieceType, oppositeColor } from './types';
import { getLegalMoves, getGameStatus, isPromotionSquare } from './gameLogic';
import { applyMove, buildCellMap, computeEnPassantTarget } from './board';
import { buildNotation } from './notation';

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
 * Transposition table entry.
 * `flag` distinguishes exact minimax values from alpha/beta bounds:
 *   - `'exact'`  — the stored score is the true minimax value.
 *   - `'lower'`  — a beta cutoff occurred; true value ≥ score.
 *   - `'upper'`  — a fail-low occurred; true value ≤ score.
 */
interface TTEntry {
    score: number;
    flag: 'exact' | 'lower' | 'upper';
}

/**
 * Static material evaluation relative to `color`.
 * Returns the sum of `color`'s piece values minus the opponent's.
 *
 * @param cells - Board state to evaluate.
 * @param color - The side the score is expressed from (positive = `color` is ahead).
 * @returns Net material advantage in pawn units.
 */
export function evaluate(cells: Cell[], color: Color): number {
    let score = 0;
    for (const cell of cells) {
        if (!cell.piece) continue;
        const value = PIECE_VALUES[cell.piece.type];
        score += cell.piece.color === color ? value : -value;
    }
    return score;
}

/**
 * Computes the en-passant target that results from `move`, or `null`.
 *
 * @param cellMap - Pre-built O(1) lookup map for the current board state.
 * @param move - The half-move being played.
 * @returns The en-passant target square for the next ply, or `null`.
 */
function newEnPassant(cellMap: Map<string, Cell>, move: Move): Position | null {
    const piece = cellMap.get(`${move.from.q},${move.from.r}`)?.piece;
    return computeEnPassantTarget(move.from, move.to, piece);
}

/**
 * Applies `move` to `cells` and auto-promotes any pawn to queen.
 * Auto-promotion to queen is used so minimax always evaluates the strongest resulting piece;
 * the actual promotion choice is handled separately in the UI layer.
 *
 * @param cells - Board state before the move.
 * @param move - The half-move to apply.
 * @param enPassantTarget - En-passant target available this ply, or `null`.
 * @param color - Side making the move.
 * @param cellMap - Pre-built O(1) lookup map for the current board state.
 * @returns A new `Cell[]` with the move applied and any promotion resolved to queen.
 */
function simulateMove(
    cells: Cell[],
    move: Move,
    enPassantTarget: Position | null,
    color: Color,
    cellMap: Map<string, Cell>,
): Cell[] {
    const next = applyMove(cells, move.from, move.to, enPassantTarget, color);
    const piece = cellMap.get(`${move.from.q},${move.from.r}`)?.piece;

    if (piece?.type === 'pawn' && isPromotionSquare(move.to.q, move.to.r, color)) {
        return next.map(cell =>
            cell.q === move.to.q && cell.r === move.to.r
                ? { ...cell, piece: { type: 'queen', color } }
                : cell,
        );
    }
    return next;
}

/**
 * Builds a compact string key for the current board position + en-passant state.
 * Cells are always generated in the same order (from `generateBoard`), so no sort is needed.
 */
function positionKey(cells: Cell[], enPassantTarget: Position | null): string {
    let key = '';
    for (const cell of cells) {
        if (cell.piece) key += `${cell.q},${cell.r}${cell.piece.color[0]}${cell.piece.type[0]};`;
    }
    if (enPassantTarget) key += `e${enPassantTarget.q},${enPassantTarget.r}`;
    return key;
}

/**
 * MVV-LVA score for move ordering: captures are searched first, prioritizing
 * high-value victims captured by low-value attackers, so alpha-beta cuts off more branches.
 *
 * @param cellMap - Pre-built O(1) lookup map for the board state before the move.
 * @param move - The move to score.
 */
function scoreMove(cellMap: Map<string, Cell>, move: Move): number {
    const victim = cellMap.get(`${move.to.q},${move.to.r}`)?.piece;
    if (!victim) return 0;
    const attacker = cellMap.get(`${move.from.q},${move.from.r}`)?.piece;
    return PIECE_VALUES[victim.type] - (attacker ? PIECE_VALUES[attacker.type] * 0.1 : 0);
}

/**
 * Returns every legal move available to `color` in the given position.
 *
 * @param cells - Current board state.
 * @param color - The side whose moves to enumerate.
 * @param enPassantTarget - En-passant landing square available this turn, or `null`.
 * @param cellMap - Pre-built O(1) lookup map; built from `cells` when omitted.
 * @returns All legal `Move` objects for `color`, unsorted.
 */
function getAllMoves(cells: Cell[], color: Color, enPassantTarget: Position | null, cellMap?: Map<string, Cell>): Move[] {
    const map = cellMap ?? buildCellMap(cells);
    const moves: Move[] = [];
    for (const cell of cells) {
        if (cell.piece?.color !== color) continue;
        const from: Position = { q: cell.q, r: cell.r };
        for (const to of getLegalMoves(cells, from, enPassantTarget, map)) {
            moves.push({ from, to });
        }
    }
    return moves;
}

/**
 * Alpha-beta minimax search with a transposition table.
 *
 * A single `cellMap` is built once per node (for move ordering and piece lookups)
 * and passed down only to the same-node helpers — each recursive call builds its
 * own map for its own `cells`.
 *
 * @param cells - Board state at this node of the search tree.
 * @param depth - Remaining plies to search; returns the static evaluation at 0.
 * @param alpha - Lower bound for the maximizing player (best already found).
 * @param beta  - Upper bound for the minimizing player (best already found).
 * @param maximizing - `true` when it is the bot's turn to move.
 * @param botColor - The side the bot is playing; scores are always relative to this color.
 * @param enPassantTarget - En-passant target square available to the side to move at this node, or `null`.
 * @param tt - Transposition table shared across all nodes in this search.
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
    tt: Map<string, TTEntry>,
): number {
    const sideToMove: Color = maximizing ? botColor : oppositeColor(botColor);
    const status = getGameStatus(cells, sideToMove, enPassantTarget);

    if (status === 'checkmate') return maximizing ? -10_000 : 10_000;
    // Stalemate per Glinski's rules: the stalemating side gets ¾ of a point.
    // Score ±7500 so the bot pursues (or avoids) stalemate accordingly.
    if (status === 'stalemate') return maximizing ? -7_500 : 7_500;
    if (depth === 0) return evaluate(cells, botColor);

    // Transposition table lookup — adjust alpha/beta bounds or return early if exact.
    const ttKey = `${positionKey(cells, enPassantTarget)}|${depth}|${maximizing ? 1 : 0}`;
    const entry = tt.get(ttKey);
    if (entry !== undefined) {
        if (entry.flag === 'exact') return entry.score;
        if (entry.flag === 'lower') alpha = Math.max(alpha, entry.score);
        else                        beta  = Math.min(beta,  entry.score);
        if (alpha >= beta) return entry.score;
    }

    const origAlpha = alpha;
    const origBeta  = beta;

    // Build the cell map once for this node; reuse it in scoreMove, simulateMove, newEnPassant.
    const cellMap = buildCellMap(cells);

    const moves = getAllMoves(cells, sideToMove, enPassantTarget, cellMap)
        .sort((a, b) => scoreMove(cellMap, b) - scoreMove(cellMap, a));

    let best: number;
    let cutoff = false;

    if (maximizing) {
        best = -Infinity;
        for (const move of moves) {
            const next = simulateMove(cells, move, enPassantTarget, sideToMove, cellMap);
            const score = minimax(next, depth - 1, alpha, beta, false, botColor, newEnPassant(cellMap, move), tt);
            if (score > best) best = score;
            if (score > alpha) alpha = score;
            if (alpha >= beta) { cutoff = true; break; }
        }
    }
    else {
        best = Infinity;
        for (const move of moves) {
            const next = simulateMove(cells, move, enPassantTarget, sideToMove, cellMap);
            const score = minimax(next, depth - 1, alpha, beta, true, botColor, newEnPassant(cellMap, move), tt);
            if (score < best) best = score;
            if (score < beta) beta = score;
            if (alpha >= beta) { cutoff = true; break; }
        }
    }

    // Store with the correct bound type so future lookups can use or narrow alpha/beta.
    let flag: TTEntry['flag'];
    if (!cutoff) {
        flag = 'exact';
    } else if (maximizing) {
        flag = best >= origBeta ? 'lower' : 'upper';
    } else {
        flag = best <= origAlpha ? 'upper' : 'lower';
    }
    tt.set(ttKey, { score: best, flag });

    return best;
}

/**
 * Minimax search depth (total plies including the root move) for each difficulty.
 *
 * - `medium`: 3 plies — bot sees its own move + opponent's best reply + bot's counter.
 *   Handles simple tactics such as one-move threats.
 * - `hard`: 4 plies — bot looks 4 half-moves ahead with full alpha-beta pruning and
 *   MVV-LVA move ordering. Spots forks, skewers, and basic combinations; a genuine
 *   challenge for casual players. Kept at 4 (not 5) because hex chess has a higher
 *   branching factor (~30 moves/position) than square chess, so depth 5 regularly
 *   exceeds the worker's 8-second timeout in complex middlegame positions.
 *
 * `'easy'` returns a random legal move and never consults this table.
 */
const DEPTH: Record<'medium' | 'hard', number> = { medium: 3, hard: 4 };

/** One engine-suggested move with its evaluation score (from white's perspective). */
export interface AnalysisMoveResult {
    from: Position;
    to: Position;
    /** Score in pawn units from white's perspective after this move. */
    score: number;
    /** Human-readable SAN-style notation, e.g. "Nf3" or "exd5". */
    notation: string;
}

/** Full analysis result for a position. */
export interface AnalysisResult {
    /** Position evaluation in pawn units from white's perspective. */
    score: number;
    /** Top N engine-suggested moves, best first. */
    topMoves: AnalysisMoveResult[];
}

/**
 * Evaluates the current position at the given depth and returns the top N moves.
 * Scores are always expressed from white's perspective (positive = white ahead).
 *
 * A single transposition table is shared across all root-move evaluations so that
 * transpositions discovered while scoring one move benefit subsequent moves.
 * Each root move is searched with full `[-∞, +∞]` bounds to guarantee accurate
 * scores for every candidate, which is required to rank the top-N list correctly.
 *
 * @param cells - Current board state.
 * @param currentTurn - Side to move.
 * @param enPassantTarget - En-passant target square, or `null`.
 * @param topN - Number of top moves to return.
 * @param depth - Minimax search depth (total plies per root move).
 */
export function getAnalysisResult(
    cells: Cell[],
    currentTurn: Color,
    enPassantTarget: Position | null,
    topN = 5,
    depth = 4,
): AnalysisResult {
    const status = getGameStatus(cells, currentTurn, enPassantTarget);
    if (status === 'checkmate') {
        const score = currentTurn === 'white' ? -10_000 : 10_000;
        return { score, topMoves: [] };
    }
    if (status === 'stalemate') return { score: 0, topMoves: [] };

    const maximizing = currentTurn === 'white';
    const cellMap = buildCellMap(cells);

    const moves = getAllMoves(cells, currentTurn, enPassantTarget, cellMap)
        .sort((a, b) => scoreMove(cellMap, b) - scoreMove(cellMap, a));

    // One TT shared across all root-move searches — transpositions at depth ≥ 2
    // discovered while evaluating one root move can prune branches in later moves.
    const tt = new Map<string, TTEntry>();

    const scored: AnalysisMoveResult[] = moves.map(move => {
        const next = simulateMove(cells, move, enPassantTarget, currentTurn, cellMap);
        // Full [-∞, +∞] bounds per root move preserve exact scores for ranking.
        const score = minimax(
            next, depth - 1, -Infinity, Infinity,
            !maximizing, 'white', newEnPassant(cellMap, move), tt,
        );

        // Build notation using the shared notation module (same as move history).
        const piece = cellMap.get(`${move.from.q},${move.from.r}`)?.piece;
        const targetCell = cellMap.get(`${move.to.q},${move.to.r}`);
        const isCapture = !!(targetCell?.piece) ||
            (enPassantTarget?.q === move.to.q && enPassantTarget?.r === move.to.r);
        const notation = piece
            ? buildNotation(piece, move.from, move.to, isCapture, '', cells, enPassantTarget)
            : '?';

        return { from: move.from, to: move.to, score, notation };
    });

    scored.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);

    return {
        score: scored[0]?.score ?? evaluate(cells, 'white'),
        topMoves: scored.slice(0, topN),
    };
}

/**
 * Selects the best move for the bot using alpha-beta minimax.
 * On `'easy'` difficulty a random legal move is returned instead of a search.
 *
 * @param cells - Current board state.
 * @param botColor - The side the bot is playing.
 * @param enPassantTarget - En-passant landing square available this turn, or `null`.
 * @param difficulty - Search depth:
 *   - `'easy'`   picks a random legal move (no search).
 *   - `'medium'` searches 3 plies (bot move + opponent reply + bot counter-reply).
 *   - `'hard'`   searches 5 plies for genuine tactical awareness.
 * @returns The chosen `Move`, or `null` if the bot has no legal moves (checkmate or stalemate).
 */
export function getBotMove(cells: Cell[], botColor: Color, enPassantTarget: Position | null, difficulty: Difficulty): Move | null {
    const cellMap = buildCellMap(cells);
    const moves = getAllMoves(cells, botColor, enPassantTarget, cellMap);
    if (moves.length === 0) return null;

    if (difficulty === 'easy')
        return moves[Math.floor(Math.random() * moves.length)];

    const depth = DEPTH[difficulty as 'medium' | 'hard'];
    const tt = new Map<string, TTEntry>();
    let bestMove: Move | null = null;
    let bestScore = -Infinity;

    // Sort root moves by MVV-LVA before the main loop so the first moves searched
    // are most likely to be good, improving alpha-beta cutoff rates early.
    const sortedMoves = moves.sort((a, b) => scoreMove(cellMap, b) - scoreMove(cellMap, a));

    for (const move of sortedMoves) {
        const next = simulateMove(cells, move, enPassantTarget, botColor, cellMap);
        const score = minimax(next, depth - 1, -Infinity, Infinity, false, botColor, newEnPassant(cellMap, move), tt);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}
