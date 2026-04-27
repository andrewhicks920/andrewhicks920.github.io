import { useState, useCallback, useRef } from 'react';
import { type Cell, type Color, type Piece, type Position, type MoveRecord, oppositeColor } from '../game/types';
import { generateBoard, samePos, applyMove, computeEnPassantTarget, posKey, parseJan } from '../game/board';
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

/** Tracks a pawn promotion that is waiting for the player to pick a piece. */
interface PendingPromotion {
    pos: Position;
    baseNotation: string;
    color: Color;
}

/** Full board snapshot pushed before each move so undo can restore it. */
interface GameSnapshot {
    cells: Cell[];
    currentTurn: Color;
    enPassantTarget: Position | null;
    gameStatus: 'playing' | 'check' | 'checkmate' | 'stalemate';
    capturedByWhite: Piece[];
    capturedByBlack: Piece[];
    moveHistory: MoveRecord[];
    pendingPromotion: PendingPromotion | null;
}

function findCapture(cells: Cell[], to: Position, enPassantTarget: Position | null, movingColor: Color): Piece | null {
    const normal = cells.find(c => samePos(c, to))?.piece ?? null;
    if (normal) return normal;
    if (!enPassantTarget || !samePos(to, enPassantTarget)) return null;
    const epCapturedR = enPassantTarget.r + (movingColor === 'white' ? -1 : 1);
    return cells.find(c => c.q === enPassantTarget.q && c.r === epCapturedR)?.piece ?? null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame() {
    const [cells, setCells] = useState<Cell[]>(() => generateBoard());
    const [currentTurn, setCurrentTurn] = useState<Color>('white');
    const [selectedPos, setSelectedPos] = useState<Position | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);
    const [enPassantTarget, setEnPassantTarget] = useState<Position | null>(null);
    const [gameStatus, setGameStatus] = useState<'playing' | 'check' | 'checkmate' | 'stalemate'>('playing');
    const [capturedByWhite, setCapturedByWhite] = useState<Piece[]>([]);
    const [capturedByBlack, setCapturedByBlack] = useState<Piece[]>([]);
    const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
    const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
    const [canUndo, setCanUndo] = useState(false);

    // Snapshot stack stored in a ref — changes here don't need to trigger re-renders.
    const snapshotsRef = useRef<GameSnapshot[]>([]);

    const executeMove = useCallback((from: Position, to: Position) => {
        const movingPiece = cells.find(c => samePos(c, from))?.piece;
        if (!movingPiece) return;

        // Push snapshot of current state so undo can restore it
        snapshotsRef.current.push({
            cells,
            currentTurn,
            enPassantTarget,
            gameStatus,
            capturedByWhite,
            capturedByBlack,
            moveHistory,
            pendingPromotion,
        });
        setCanUndo(true);

        const newEnPassantTarget = computeEnPassantTarget(from, to, movingPiece);
        const captured = findCapture(cells, to, enPassantTarget, movingPiece.color);

        if (captured) {
            if (movingPiece.color === 'white') setCapturedByWhite(prev => [...prev, captured]);
            else setCapturedByBlack(prev => [...prev, captured]);
        }

        const newCells = applyMove(cells, from, to, enPassantTarget, movingPiece.color);
        const nextTurn = oppositeColor(currentTurn);
        const isPromotion = movingPiece.type === 'pawn' && isPromotionSquare(to.q, to.r, movingPiece.color);

        setCells(newCells);
        setEnPassantTarget(newEnPassantTarget);
        setSelectedPos(null);
        setValidMoves([]);

        if (isPromotion) {
            // Defer writing to move history until the piece is chosen — no '=?' sentinel needed.
            const baseNotation = buildNotation(movingPiece, from, to, !!captured, '', cells, enPassantTarget);
            setPendingPromotion({ pos: to, baseNotation, color: movingPiece.color });
        } else {
            const nextStatus = getGameStatus(newCells, nextTurn, newEnPassantTarget);
            const notation = buildNotation(movingPiece, from, to, !!captured, nextStatus, cells, enPassantTarget);
            setMoveHistory(prev => addToHistory(prev, movingPiece.color, notation));
            setCurrentTurn(nextTurn);
            setGameStatus(nextStatus);
        }
    }, [cells, currentTurn, enPassantTarget, gameStatus, capturedByWhite, capturedByBlack, moveHistory, pendingPromotion]);

    const handleCellClick = useCallback((q: number, r: number) => {
        if (pendingPromotion) return;
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate') return;

        const clicked: Position = { q, r };
        const clickedCell = cells.find(c => c.q === q && c.r === r);

        if (selectedPos && validMoves.some(m => samePos(m, clicked))) {
            executeMove(selectedPos, clicked);
            return;
        }

        if (clickedCell?.piece?.color === currentTurn) {
            setSelectedPos(clicked);
            setValidMoves(getLegalMoves(cells, clicked, enPassantTarget));
            return;
        }

        setSelectedPos(null);
        setValidMoves([]);
    }, [cells, currentTurn, selectedPos, validMoves, enPassantTarget, gameStatus, pendingPromotion, executeMove]);

    const resetGame = useCallback(() => {
        setCells(generateBoard());
        setCurrentTurn('white');
        setSelectedPos(null);
        setValidMoves([]);
        setEnPassantTarget(null);
        setGameStatus('playing');
        setCapturedByWhite([]);
        setCapturedByBlack([]);
        setPendingPromotion(null);
        setMoveHistory([]);
        snapshotsRef.current = [];
        setCanUndo(false);
    }, []);

    const undoMove = useCallback(() => {
        const stack = snapshotsRef.current;
        if (stack.length === 0) return;
        const snap = stack[stack.length - 1];
        snapshotsRef.current = stack.slice(0, -1);

        setCells(snap.cells);
        setCurrentTurn(snap.currentTurn);
        setEnPassantTarget(snap.enPassantTarget);
        setGameStatus(snap.gameStatus);
        setCapturedByWhite(snap.capturedByWhite);
        setCapturedByBlack(snap.capturedByBlack);
        setMoveHistory(snap.moveHistory);
        setPendingPromotion(snap.pendingPromotion);
        setSelectedPos(null);
        setValidMoves([]);
        setCanUndo(snapshotsRef.current.length > 0);
    }, []);

    /** Load a custom position from a JAN string. */
    const loadPosition = useCallback((jan: string) => {
        try {
            const pieces = parseJan(jan);
            const newCells = generateBoard().map(cell => ({
                ...cell,
                piece: pieces.get(posKey(cell)) ?? null,
            }));
            setCells(newCells);
            setCurrentTurn('white');
            setSelectedPos(null);
            setValidMoves([]);
            setEnPassantTarget(null);
            setGameStatus('playing');
            setCapturedByWhite([]);
            setCapturedByBlack([]);
            setPendingPromotion(null);
            setMoveHistory([]);
            snapshotsRef.current = [];
            setCanUndo(false);
        } catch (err) {
            console.warn('loadPosition: invalid JAN string', err);
        }
    }, []);

    /**
     * Replay a game from SAN-style move tokens (our own notation format).
     * Accepts the same format this app exports: move numbers are optional and stripped.
     * Example: "1. e4 e5 2. Nf3 Nc6"
     */
    const loadPgn = useCallback((pgn: string) => {
        const tokens = pgn
            .replace(/\d+\./g, '')
            .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
            .trim()
            .split(/\s+/)
            .filter(t => t.length > 0);

        let cCells = generateBoard();
        let cTurn: Color = 'white';
        let cEp: Position | null = null;
        let cCapW: Piece[] = [];
        let cCapB: Piece[] = [];
        let cHistory: MoveRecord[] = [];
        let cStatus: 'playing' | 'check' | 'checkmate' | 'stalemate' = 'playing';
        const newSnapshots: GameSnapshot[] = [];

        for (const token of tokens) {
            const parsed = parseSanToken(token, cCells, cTurn, cEp);
            if (!parsed) break;

            const { from, to, promotion } = parsed;
            const movingPiece = cCells.find(c => c.q === from.q && c.r === from.r)?.piece;
            if (!movingPiece) break;

            newSnapshots.push({
                cells: cCells, currentTurn: cTurn, enPassantTarget: cEp,
                gameStatus: cStatus, capturedByWhite: cCapW, capturedByBlack: cCapB,
                moveHistory: cHistory, pendingPromotion: null,
            });

            const captured = findCapture(cCells, to, cEp, movingPiece.color);
            if (captured) {
                if (movingPiece.color === 'white') cCapW = [...cCapW, captured];
                else cCapB = [...cCapB, captured];
            }

            const newEp = computeEnPassantTarget(from, to, movingPiece);
            let newCells = applyMove(cCells, from, to, cEp, movingPiece.color);

            // Apply promotion (explicit or auto-queen if piece reached promo square)
            if (movingPiece.type === 'pawn' && isPromotionSquare(to.q, to.r, movingPiece.color)) {
                const promoType: PromoPieceType = promotion ?? 'queen';
                newCells = newCells.map(c =>
                    c.q === to.q && c.r === to.r
                        ? { ...c, piece: { type: promoType, color: movingPiece.color } }
                        : c,
                );
            }

            const nextTurn = oppositeColor(cTurn);
            const nextStatus = getGameStatus(newCells, nextTurn, newEp);
            cHistory = addToHistory(cHistory, movingPiece.color, token);
            cCells = newCells;
            cEp = newEp;
            cTurn = nextTurn;
            cStatus = nextStatus;

            if (cStatus === 'checkmate' || cStatus === 'stalemate') break;
        }

        setCells(cCells);
        setCurrentTurn(cTurn);
        setEnPassantTarget(cEp);
        setGameStatus(cStatus);
        setCapturedByWhite(cCapW);
        setCapturedByBlack(cCapB);
        setMoveHistory(cHistory);
        setPendingPromotion(null);
        setSelectedPos(null);
        setValidMoves([]);
        snapshotsRef.current = newSnapshots;
        setCanUndo(newSnapshots.length > 0);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedPos(null);
        setValidMoves([]);
    }, []);

    const confirmPromotion = useCallback((pieceType: PromoPieceType) => {
        if (!pendingPromotion) return;
        const { pos, baseNotation, color } = pendingPromotion;
        const newCells = cells.map(cell =>
            samePos(cell, pos)
                ? { ...cell, piece: { type: pieceType, color } }
                : cell,
        );
        const nextTurn = oppositeColor(color);
        const nextStatus = getGameStatus(newCells, nextTurn, enPassantTarget);
        const checkSym = nextStatus === 'checkmate' ? '#' : nextStatus === 'check' ? '+' : '';
        const fullNotation = `${baseNotation}=${PROMO_LETTERS[pieceType]}${checkSym}`;

        setMoveHistory(prev => addToHistory(prev, color, fullNotation));
        setCells(newCells);
        setCurrentTurn(nextTurn);
        setPendingPromotion(null);
        setGameStatus(nextStatus);
    }, [pendingPromotion, cells, enPassantTarget]);

    return {
        cells,
        currentTurn,
        selectedPos,
        validMoves,
        handleCellClick,
        executeBotMove: executeMove,
        gameStatus,
        capturedByWhite,
        capturedByBlack,
        promotionPending: pendingPromotion?.pos ?? null,
        confirmPromotion,
        resetGame,
        clearSelection,
        moveHistory,
        enPassantTarget,
        undoMove,
        canUndo,
        loadPosition,
        loadPgn,
    };
}
