import { useState, useCallback } from 'react';
import { type Cell, type Color, type Piece, type PieceType, type Position, type MoveRecord, oppositeColor } from '../game/types';
import { generateBoard, samePos, applyMove, computeEnPassantTarget, FILES } from '../game/board';
import { getLegalMoves, getGameStatus, isPromotionSquare } from '../game/gameLogic';

const PIECE_LETTERS: Record<PieceType, string> = {
    king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '',
};

export type PromoPieceType = 'queen' | 'rook' | 'bishop' | 'knight';

const PROMO_LETTERS: Record<PromoPieceType, string> = {
    queen: 'Q', rook: 'R', bishop: 'B', knight: 'N',
};

/** Tracks a pawn promotion that is waiting for the player to pick a piece. */
interface PendingPromotion {
    pos: Position;
    baseNotation: string;
    color: Color;
}

function fileOf(pos: Position): string { return FILES[pos.q + 5] ?? '?'; }
function rankOf(pos: Position): number { return pos.q + pos.r + 6; }

/**
 * Builds SAN-style notation with proper disambiguation.
 *
 * Disambiguation rules (applied when multiple same-type pieces can reach `to`):
 *   1. Use source file if it uniquely identifies the piece.
 *   2. Else use source rank.
 *   3. Else use full source coordinate.
 *
 * Pawn captures always include the source file (standard SAN).
 */
function buildNotation(
    piece: Piece,
    from: Position,
    to: Position,
    captured: boolean,
    status: string,
    boardCells: Cell[],
    enPassantTarget: Position | null,
): string {
    const toFile = fileOf(to);
    const toRank = rankOf(to);
    const fromFile = fileOf(from);
    const fromRank = rankOf(from);
    const capSym = captured ? 'x' : '';
    const checkSym = status === 'checkmate' ? '#' : status === 'check' ? '+' : '';

    // Pawns: capture includes source file, moves omit piece letter
    if (piece.type === 'pawn') {
        if (captured) return `${fromFile}x${toFile}${toRank}${checkSym}`;
        return `${toFile}${toRank}${checkSym}`;
    }

    // Find all other same-type/color pieces that can also legally reach `to`
    const ambiguousOrigins: Position[] = boardCells
        .filter(c =>
            c.piece?.type === piece.type &&
            c.piece?.color === piece.color &&
            !(c.q === from.q && c.r === from.r),
        )
        .filter(c => getLegalMoves(boardCells, { q: c.q, r: c.r }, enPassantTarget)
            .some(m => m.q === to.q && m.r === to.r),
        )
        .map(c => ({ q: c.q, r: c.r }));

    let disambiguation = '';

    if (ambiguousOrigins.length > 0) {
        // All origins that can reach `to`, including the moving piece
        const allOrigins: Position[] = [from, ...ambiguousOrigins];

        // Is the source file unique among all origins?
        const sameFileCount = allOrigins.filter(p => p.q === from.q).length;
        if (sameFileCount === 1) {
            disambiguation = fromFile;
        }
        else {
            // Is the source rank unique?
            const sameRankCount = allOrigins.filter(p => rankOf(p) === fromRank).length;
            if (sameRankCount === 1)
                disambiguation = String(fromRank);

            else // Step 3: full coordinate
                disambiguation = `${fromFile}${fromRank}`;
        }
    }

    return `${PIECE_LETTERS[piece.type]}${disambiguation}${capSym}${toFile}${toRank}${checkSym}`;
}

function findCapture(cells: Cell[], to: Position, enPassantTarget: Position | null, movingColor: Color,): Piece | null {
    const normal = cells.find(c => samePos(c, to))?.piece ?? null;

    if (normal)
        return normal;

    if (!enPassantTarget || !samePos(to, enPassantTarget))
        return null;

    const epCapturedR = enPassantTarget.r + (movingColor === 'white' ? -1 : 1);
    return cells.find(c => c.q === enPassantTarget.q && c.r === epCapturedR)?.piece ?? null;
}

function addToHistory(prev: MoveRecord[], color: Color, notation: string): MoveRecord[] {
    if (color === 'white') {
        return [...prev, { moveNumber: prev.length + 1, white: notation }];
    }
    if (prev.length === 0) {
        return [{ moveNumber: 1, black: notation }];
    }
    const last = prev[prev.length - 1];
    if (last.white !== undefined && last.black === undefined) {
        return [...prev.slice(0, -1), { ...last, black: notation }];
    }
    return [...prev, { moveNumber: prev.length + 1, black: notation }];
}

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

    const executeMove = useCallback((from: Position, to: Position) => {
        const movingPiece = cells.find(c => samePos(c, from))?.piece;
        if (!movingPiece) return;

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
    }, [cells, currentTurn, enPassantTarget]);

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
        moveHistory,
        enPassantTarget,
    };
}
