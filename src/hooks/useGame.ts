import { useReducer, useCallback, useRef, useLayoutEffect } from 'react';
import { type Cell, type Color, type GameStatus, type Piece, type Position, type MoveRecord, oppositeColor } from '../game/types';
import { generateBoard, samePos, applyMove, computeEnPassantTarget, posKey, boardPositionKey, parseJan } from '../game/board';
import { getLegalMoves, getGameStatus, isPromotionSquare } from '../game/gameLogic';
import {
    buildNotation,
    addToHistory,
    parseSanToken,
    PROMO_LETTERS,
    type PromoPieceType,
} from '../game/notation';

// Re-export so consumers (useBot, Board) don't need to change their import sites.
export type { PromoPieceType };

// Constants
/** Maximum entries kept in the undo stack. Older snapshots are discarded. */
const MAX_UNDO_STACK = 50;

/**
 * Half-move clock threshold for the fifty-move draw rule.
 * 100 half-moves = 50 full moves without a capture or pawn push.
 */
const FIFTY_MOVE_LIMIT = 100;

// Types
/** Tracks a pawn promotion that is waiting for the player to pick a piece. */
interface PendingPromotion {
    /** Board square that the promoting pawn now occupies. */
    pos: Position;
    /**
     * Partial move notation built before the promotion piece was chosen
     * (e.g. `"g6"` for a pawn that moved to g6). The chosen piece letter and
     * any check symbol are appended once the player confirms their selection.
     */
    baseNotation: string;
    /** Color of the pawn that is promoting. */
    color: Color;
}

/** Complete game state managed by {@link gameReducer}. */
interface GameState {
    cells: Cell[];
    currentTurn: Color;
    selectedPos: Position | null;
    validMoves: Position[];
    enPassantTarget: Position | null;
    gameStatus: GameStatus;
    capturedByWhite: Piece[];
    capturedByBlack: Piece[];
    pendingPromotion: PendingPromotion | null;
    moveHistory: MoveRecord[];
    /** `true` when there is at least one snapshot on the undo stack. */
    canUndo: boolean;
    /**
     * Half-move clock for the fifty-move draw rule.
     * Resets to 0 on any capture or pawn move; a draw is claimed at 100.
     */
    halfMoveClock: number;
    /**
     * Occurrence count keyed by {@link boardPositionKey}.
     * A count of 3 triggers a draw by threefold repetition.
     */
    positionCounts: Map<string, number>;
}

/** Full board snapshot pushed before each move so undo can restore it. */
interface GameSnapshot {
    cells: Cell[];
    currentTurn: Color;
    enPassantTarget: Position | null;
    gameStatus: GameStatus;
    capturedByWhite: Piece[];
    capturedByBlack: Piece[];
    moveHistory: MoveRecord[];
    pendingPromotion: PendingPromotion | null;
    halfMoveClock: number;
    positionCounts: Map<string, number>;
}

type GameAction =
    /** Execute a validated move from `from` to `to`. */
    | { type: 'EXECUTE_MOVE'; from: Position; to: Position }
    /** Resolve a pending pawn promotion with the chosen piece. */
    | { type: 'CONFIRM_PROMOTION'; pieceType: PromoPieceType }
    /** Select a piece at `pos` with its pre-computed legal move set. */
    | { type: 'SELECT'; pos: Position; moves: Position[] }
    /** Clear the current piece selection without making a move. */
    | { type: 'CLEAR_SELECTION' }
    /** Restore a previously saved snapshot (undo). */
    | { type: 'RESTORE_SNAPSHOT'; snapshot: GameSnapshot; hasMore: boolean }
    /** Reset to the standard Glinski starting position. */
    | { type: 'RESET' }
    /** Wholesale replace the game state (used by loadPosition / loadPgn). */
    | { type: 'REPLACE'; newState: GameState };

// ---------------------------------------------------------------------------
// Helpers (module-level, pure — safe to call from the reducer and callbacks)
// ---------------------------------------------------------------------------

/**
 * Determines which piece (if any) is captured by a move to `to`.
 * Handles normal captures and en-passant, where the captured pawn sits on a
 * different rank than the landing square.
 */
function findCapture(cells: Cell[], to: Position, enPassantTarget: Position | null, movingColor: Color): Piece | null {
    const normal = cells.find(c => samePos(c, to))?.piece ?? null;
    if (normal) return normal;
    if (!enPassantTarget || !samePos(to, enPassantTarget)) return null;
    const epCapturedR = enPassantTarget.r + (movingColor === 'white' ? -1 : 1);
    return cells.find(c => c.q === enPassantTarget.q && c.r === epCapturedR)?.piece ?? null;
}

/** Shallow-copies `state` into a {@link GameSnapshot} (deep-copies positionCounts). */
function captureSnapshot(state: GameState): GameSnapshot {
    return {
        cells:           state.cells,
        currentTurn:     state.currentTurn,
        enPassantTarget: state.enPassantTarget,
        gameStatus:      state.gameStatus,
        capturedByWhite: state.capturedByWhite,
        capturedByBlack: state.capturedByBlack,
        moveHistory:     state.moveHistory,
        pendingPromotion: state.pendingPromotion,
        halfMoveClock:   state.halfMoveClock,
        positionCounts:  new Map(state.positionCounts), // copy so undo restores old counts
    };
}

/** Computes the next game status, folding in draw conditions. */
function computeNextStatus(
    cells: Cell[],
    nextTurn: Color,
    enPassantTarget: Position | null,
    halfMoveClock: number,
    positionCounts: Map<string, number>,
): GameStatus {
    if (halfMoveClock >= FIFTY_MOVE_LIMIT) return 'draw';
    const bpKey = boardPositionKey(cells, nextTurn, enPassantTarget);
    if ((positionCounts.get(bpKey) ?? 0) >= 3) return 'draw';
    return getGameStatus(cells, nextTurn, enPassantTarget);
}

/** Returns the standard Glinski starting {@link GameState}. */
function initialState(): GameState {
    const cells = generateBoard();
    // Seed the starting position with count 1 so that two returns to it equal
    // threefold repetition correctly (1 + 1 + 1 = 3).
    const startKey = boardPositionKey(cells, 'white', null);
    return {
        cells,
        currentTurn:     'white',
        selectedPos:     null,
        validMoves:      [],
        enPassantTarget: null,
        gameStatus:      'playing',
        capturedByWhite: [],
        capturedByBlack: [],
        pendingPromotion: null,
        moveHistory:     [],
        canUndo:         false,
        halfMoveClock:   0,
        positionCounts:  new Map([[startKey, 1]]),
    };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {

        case 'EXECUTE_MOVE': {
            const { from, to } = action;
            const movingPiece = state.cells.find(c => samePos(c, from))?.piece;
            if (!movingPiece) return state;

            const captured      = findCapture(state.cells, to, state.enPassantTarget, movingPiece.color);
            const newEp         = computeEnPassantTarget(from, to, movingPiece);
            const newCells      = applyMove(state.cells, from, to, state.enPassantTarget, movingPiece.color);

            const newCapturedByWhite = movingPiece.color === 'white' && captured
                ? [...state.capturedByWhite, captured] : state.capturedByWhite;
            const newCapturedByBlack = movingPiece.color === 'black' && captured
                ? [...state.capturedByBlack, captured] : state.capturedByBlack;

            // Fifty-move clock: reset on capture or pawn move.
            const newHalfMoveClock = (captured || movingPiece.type === 'pawn')
                ? 0
                : state.halfMoveClock + 1;

            const isPromotion = movingPiece.type === 'pawn'
                && isPromotionSquare(to.q, to.r, movingPiece.color);

            if (isPromotion) {
                // Defer notation and turn-advance until the player chooses a piece.
                // Draw conditions are checked again in CONFIRM_PROMOTION.
                const baseNotation = buildNotation(
                    movingPiece, from, to, !!captured, '', state.cells, state.enPassantTarget,
                );
                return {
                    ...state,
                    cells:            newCells,
                    enPassantTarget:  newEp,
                    selectedPos:      null,
                    validMoves:       [],
                    capturedByWhite:  newCapturedByWhite,
                    capturedByBlack:  newCapturedByBlack,
                    halfMoveClock:    newHalfMoveClock,
                    pendingPromotion: { pos: to, baseNotation, color: movingPiece.color },
                };
            }

            const nextTurn = oppositeColor(state.currentTurn);

            // Update threefold-repetition counts for the resulting position.
            const bpKey = boardPositionKey(newCells, nextTurn, newEp);
            const newPositionCounts = new Map(state.positionCounts);
            newPositionCounts.set(bpKey, (newPositionCounts.get(bpKey) ?? 0) + 1);

            const nextStatus = computeNextStatus(newCells, nextTurn, newEp, newHalfMoveClock, newPositionCounts);
            const notation   = buildNotation(movingPiece, from, to, !!captured, nextStatus, state.cells, state.enPassantTarget);

            return {
                ...state,
                cells:            newCells,
                currentTurn:      nextTurn,
                enPassantTarget:  newEp,
                selectedPos:      null,
                validMoves:       [],
                capturedByWhite:  newCapturedByWhite,
                capturedByBlack:  newCapturedByBlack,
                pendingPromotion: null,
                gameStatus:       nextStatus,
                moveHistory:      addToHistory(state.moveHistory, movingPiece.color, notation),
                halfMoveClock:    newHalfMoveClock,
                positionCounts:   newPositionCounts,
            };
        }

        case 'CONFIRM_PROMOTION': {
            if (!state.pendingPromotion) return state;
            const { pos, baseNotation, color } = state.pendingPromotion;
            const { pieceType } = action;

            const newCells = state.cells.map(cell =>
                samePos(cell, pos)
                    ? { ...cell, piece: { type: pieceType, color } }
                    : cell,
            );
            const nextTurn = oppositeColor(color);

            const bpKey = boardPositionKey(newCells, nextTurn, state.enPassantTarget);
            const newPositionCounts = new Map(state.positionCounts);
            newPositionCounts.set(bpKey, (newPositionCounts.get(bpKey) ?? 0) + 1);

            const nextStatus = computeNextStatus(
                newCells, nextTurn, state.enPassantTarget,
                state.halfMoveClock, newPositionCounts,
            );
            const checkSym    = nextStatus === 'checkmate' ? '#' : nextStatus === 'check' ? '+' : '';
            const fullNotation = `${baseNotation}=${PROMO_LETTERS[pieceType]}${checkSym}`;

            return {
                ...state,
                cells:            newCells,
                currentTurn:      nextTurn,
                pendingPromotion: null,
                gameStatus:       nextStatus,
                moveHistory:      addToHistory(state.moveHistory, color, fullNotation),
                positionCounts:   newPositionCounts,
            };
        }

        case 'SELECT':
            return { ...state, selectedPos: action.pos, validMoves: action.moves };

        case 'CLEAR_SELECTION':
            return { ...state, selectedPos: null, validMoves: [] };

        case 'RESTORE_SNAPSHOT': {
            const { snapshot, hasMore } = action;
            return {
                cells:            snapshot.cells,
                currentTurn:      snapshot.currentTurn,
                enPassantTarget:  snapshot.enPassantTarget,
                gameStatus:       snapshot.gameStatus,
                capturedByWhite:  snapshot.capturedByWhite,
                capturedByBlack:  snapshot.capturedByBlack,
                moveHistory:      snapshot.moveHistory,
                pendingPromotion: snapshot.pendingPromotion,
                halfMoveClock:    snapshot.halfMoveClock,
                positionCounts:   snapshot.positionCounts,
                selectedPos:      null,
                validMoves:       [],
                canUndo:          hasMore,
            };
        }

        case 'RESET':
            return initialState();

        case 'REPLACE':
            return action.newState;

        default:
            return state;
    }
}


// Hook
/**
 * Central state machine for a Glinski Hexagonal Chess game.
 *
 * Uses a single `useReducer` so every move is an atomic state transition —
 * no intermediate renders with partially-updated state.
 *
 * A `stateRef` always mirrors the latest reducer state, letting stable
 * `useCallback` wrappers (with empty dependency arrays) read fresh state
 * without causing stale-closure bugs. Snapshot management is handled in the
 * callback layer (not the reducer) because it involves a mutable ref.
 *
 * Draw conditions tracked:
 * - **Fifty-move rule** — 100 half-moves without capture or pawn move.
 * - **Threefold repetition** — same position (pieces + side to move + ep) reached 3 times.
 *
 * The undo stack is capped at {@link MAX_UNDO_STACK} entries to bound memory use.
 */
export function useGame() {
    const [state, dispatch] = useReducer(gameReducer, undefined, initialState);

    // Always-current mirror of state for use inside stable callbacks.
    // Updated in useLayoutEffect (not inline during render) to satisfy react-hooks/refs.
    // useLayoutEffect fires synchronously after DOM mutations and before any user
    // interaction, so stateRef.current is always fresh when a callback runs.
    const stateRef = useRef(state);
    useLayoutEffect(() => {
        stateRef.current = state;
    });

    // Snapshot stack stored in a ref — mutations here don't trigger re-renders.
    const snapshotsRef = useRef<GameSnapshot[]>([]);

    // Internal helpers
    /** Pushes a snapshot of `s` onto the undo stack, respecting the cap. */
    function pushSnapshot(s: GameState): void {
        const stack = snapshotsRef.current;
        const next  = [...stack, captureSnapshot(s)];
        snapshotsRef.current = next.length > MAX_UNDO_STACK
            ? next.slice(-MAX_UNDO_STACK)
            : next;
    }

    // Stable action callbacks
    /**
     * Executes a validated move (used by both human click handler and bot hook).
     * Stable reference — no dependency on state; reads `stateRef.current` instead.
     */
    const executeMove = useCallback((from: Position, to: Position) => {
        pushSnapshot(stateRef.current);
        dispatch({ type: 'EXECUTE_MOVE', from, to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handles a human player clicking on a board cell.
     *
     * Priority order:
     * 1. Promotion pending → ignore.
     * 2. Game over → ignore.
     * 3. Clicked square is a valid destination for the selected piece → execute move.
     * 4. Clicked cell belongs to the current player → select it.
     * 5. Otherwise → clear selection.
     *
     * Stable reference — reads `stateRef.current` for fresh state.
     */
    const handleCellClick = useCallback((q: number, r: number) => {
        const s = stateRef.current;
        if (s.pendingPromotion) return;
        if (s.gameStatus === 'checkmate' || s.gameStatus === 'stalemate' || s.gameStatus === 'draw') return;

        const clicked: Position = { q, r };
        const clickedCell = s.cells.find(c => c.q === q && c.r === r);

        if (s.selectedPos && s.validMoves.some(m => samePos(m, clicked))) {
            pushSnapshot(s);
            dispatch({ type: 'EXECUTE_MOVE', from: s.selectedPos, to: clicked });
            return;
        }

        if (clickedCell?.piece?.color === s.currentTurn) {
            const moves = getLegalMoves(s.cells, clicked, s.enPassantTarget);
            dispatch({ type: 'SELECT', pos: clicked, moves });
            return;
        }

        dispatch({ type: 'CLEAR_SELECTION' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Resets all game state to the standard Glinski starting position.
     * Clears the undo stack, captured pieces, move history, and any pending promotion.
     */
    const resetGame = useCallback(() => {
        snapshotsRef.current = [];
        dispatch({ type: 'RESET' });
    }, []);

    /**
     * Pops the most-recent snapshot from the undo stack and restores it.
     * Does nothing if the stack is empty.
     */
    const undoMove = useCallback(() => {
        const stack = snapshotsRef.current;
        if (stack.length === 0) return;
        const snap    = stack[stack.length - 1];
        snapshotsRef.current = stack.slice(0, -1);
        dispatch({ type: 'RESTORE_SNAPSHOT', snapshot: snap, hasMore: stack.length > 1 });
    }, []);

    /** Deselects the currently selected piece without executing any move. */
    const clearSelection = useCallback(() => {
        dispatch({ type: 'CLEAR_SELECTION' });
    }, []);

    /**
     * Resolves a pending pawn promotion by replacing the pawn with the chosen
     * piece, then advancing the turn and evaluating game status (including draws).
     * Does nothing if there is no promotion currently pending.
     */
    const confirmPromotion = useCallback((pieceType: PromoPieceType) => {
        dispatch({ type: 'CONFIRM_PROMOTION', pieceType });
    }, []);

    /**
     * Loads a custom starting position from a JAN string, replacing the current
     * board state. Logs a warning and leaves the board unchanged on invalid input.
     */
    const loadPosition = useCallback((jan: string) => {
        try {
            const pieces   = parseJan(jan);
            const newCells = generateBoard().map(cell => ({
                ...cell,
                piece: pieces.get(posKey(cell)) ?? null,
            }));
            const base  = initialState();
            const startKey = boardPositionKey(newCells, 'white', null);
            const newState: GameState = {
                ...base,
                cells:          newCells,
                positionCounts: new Map([[startKey, 1]]),
            };
            snapshotsRef.current = [];
            dispatch({ type: 'REPLACE', newState });
        } catch (err) {
            console.warn('loadPosition: invalid JAN string', err);
        }
    }, []);

    /**
     * Replays a game from a PGN-style move token string, restoring the board to the
     * final position and populating the undo stack so every half-move can be stepped back.
     *
     * Draw conditions (fifty-move rule, threefold repetition) are detected during
     * replay and stop the replay at the first drawn position.
     */
    const loadPgn = useCallback((pgn: string) => {
        const tokens = pgn
            .replace(/\d+\./g, '')
            .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
            .trim()
            .split(/\s+/)
            .filter(t => t.length > 0);

        let cState = initialState();
        const newSnapshots: GameSnapshot[] = [];

        for (const token of tokens) {
            const parsed = parseSanToken(token, cState.cells, cState.currentTurn, cState.enPassantTarget);
            if (!parsed) break;

            const { from, to, promotion } = parsed;
            const movingPiece = cState.cells.find(c => c.q === from.q && c.r === from.r)?.piece;
            if (!movingPiece) break;

            newSnapshots.push(captureSnapshot(cState));

            const captured = findCapture(cState.cells, to, cState.enPassantTarget, movingPiece.color);
            const newCapturedByWhite = movingPiece.color === 'white' && captured
                ? [...cState.capturedByWhite, captured] : cState.capturedByWhite;
            const newCapturedByBlack = movingPiece.color === 'black' && captured
                ? [...cState.capturedByBlack, captured] : cState.capturedByBlack;

            const newEp  = computeEnPassantTarget(from, to, movingPiece);
            let newCells = applyMove(cState.cells, from, to, cState.enPassantTarget, movingPiece.color);

            if (movingPiece.type === 'pawn' && isPromotionSquare(to.q, to.r, movingPiece.color)) {
                const promoType: PromoPieceType = promotion ?? 'queen';
                newCells = newCells.map(c =>
                    c.q === to.q && c.r === to.r
                        ? { ...c, piece: { type: promoType, color: movingPiece.color } }
                        : c,
                );
            }

            const nextTurn        = oppositeColor(cState.currentTurn);
            const newHalfMoveClock = (captured || movingPiece.type === 'pawn') ? 0 : cState.halfMoveClock + 1;

            const bpKey = boardPositionKey(newCells, nextTurn, newEp);
            const newPositionCounts = new Map(cState.positionCounts);
            newPositionCounts.set(bpKey, (newPositionCounts.get(bpKey) ?? 0) + 1);

            const nextStatus = computeNextStatus(newCells, nextTurn, newEp, newHalfMoveClock, newPositionCounts);

            cState = {
                ...cState,
                cells:            newCells,
                currentTurn:      nextTurn,
                enPassantTarget:  newEp,
                gameStatus:       nextStatus,
                capturedByWhite:  newCapturedByWhite,
                capturedByBlack:  newCapturedByBlack,
                moveHistory:      addToHistory(cState.moveHistory, movingPiece.color, token),
                halfMoveClock:    newHalfMoveClock,
                positionCounts:   newPositionCounts,
                selectedPos:      null,
                validMoves:       [],
                pendingPromotion: null,
                canUndo:          true,
            };

            if (nextStatus === 'checkmate' || nextStatus === 'stalemate' || nextStatus === 'draw') break;
        }

        const cappedSnapshots = newSnapshots.length > MAX_UNDO_STACK
            ? newSnapshots.slice(-MAX_UNDO_STACK)
            : newSnapshots;

        snapshotsRef.current = cappedSnapshots;
        dispatch({ type: 'REPLACE', newState: { ...cState, canUndo: cappedSnapshots.length > 0 } });
    }, []);

    return {
        cells:            state.cells,
        currentTurn:      state.currentTurn,
        selectedPos:      state.selectedPos,
        validMoves:       state.validMoves,
        handleCellClick,
        executeBotMove:   executeMove,
        gameStatus:       state.gameStatus,
        capturedByWhite:  state.capturedByWhite,
        capturedByBlack:  state.capturedByBlack,
        promotionPending: state.pendingPromotion?.pos ?? null,
        confirmPromotion,
        resetGame,
        clearSelection,
        moveHistory:      state.moveHistory,
        enPassantTarget:  state.enPassantTarget,
        undoMove,
        canUndo:          state.canUndo,
        loadPosition,
        loadPgn,
    };
}
