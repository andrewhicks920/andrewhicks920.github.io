import { useState, useCallback } from 'react';
import { type Cell, type Color, type Piece, type PieceType, type Position, type MoveRecord } from '../game/types';
import { generateBoard, samePos, applyMove } from '../game/board';
import { getLegalMoves, getGameStatus, isPromotionSquare } from '../game/gameLogic';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l'];

const PIECE_LETTERS: Record<PieceType, string> = {
    king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '',
};

const PROMO_LETTERS: Record<PieceType, string> = {
    queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', king: '', pawn: '',
};

function buildNotation(piece: Piece, to: Position, captured: boolean, status: string): string {
    const letter = PIECE_LETTERS[piece.type];
    const file = FILES[to.q + 5] ?? '?';
    const rank = to.q + to.r + 6;
    const capSym = captured ? 'x' : '';
    const checkSym = status === 'checkmate' ? '#' : status === 'check' ? '+' : '';
    return `${letter}${capSym}${file}${rank}${checkSym}`;
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
    const [promotionPending, setPromotionPending] = useState<Position | null>(null);
    const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
    const [promotionBaseNotation, setPromotionBaseNotation] = useState<string | null>(null);

    const handleCellClick = useCallback((q: number, r: number) => {
        if (promotionPending) return;
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate') return;

        const clicked: Position = { q, r };
        const clickedCell = cells.find(c => c.q === q && c.r === r);

        // Execute a valid move
        if (selectedPos && validMoves.some(m => samePos(m, clicked))) {
            const movingPiece = cells.find(c => samePos(c, selectedPos))!.piece!;

            const isPawnDouble =
                movingPiece.type === 'pawn' && Math.abs(clicked.r - selectedPos.r) === 2;
            const newEnPassantTarget: Position | null = isPawnDouble
                ? { q: clicked.q, r: (selectedPos.r + clicked.r) / 2 }
                : null;

            const normalCapture = cells.find(c => samePos(c, clicked))?.piece ?? null;
            const epCapR = enPassantTarget
                ? enPassantTarget.r + (movingPiece.color === 'white' ? -1 : 1)
                : null;
            const epCapture =
                enPassantTarget && samePos(clicked, enPassantTarget) && epCapR !== null
                    ? cells.find(c => c.q === enPassantTarget.q && c.r === epCapR)?.piece ?? null
                    : null;
            const captured = normalCapture ?? epCapture;

            if (captured) {
                if (movingPiece.color === 'white')
                    setCapturedByWhite(prev => [...prev, captured]);
                else
                    setCapturedByBlack(prev => [...prev, captured]);
            }

            const newCells = applyMove(cells, selectedPos, clicked, enPassantTarget, movingPiece.color);
            const nextTurn: Color = currentTurn === 'white' ? 'black' : 'white';
            const isPromotion =
                movingPiece.type === 'pawn' &&
                isPromotionSquare(clicked.q, clicked.r, movingPiece.color);

            setCells(newCells);
            setEnPassantTarget(newEnPassantTarget);
            setSelectedPos(null);
            setValidMoves([]);

            if (isPromotion) {
                const baseNotation = buildNotation(movingPiece, clicked, !!captured, '');
                setPromotionBaseNotation(baseNotation);
                setMoveHistory(prev => addToHistory(prev, movingPiece.color, baseNotation + '=?'));
                setPromotionPending(clicked);
            } else {
                const nextStatus = getGameStatus(newCells, nextTurn, newEnPassantTarget);
                const notation = buildNotation(movingPiece, clicked, !!captured, nextStatus);
                setMoveHistory(prev => addToHistory(prev, movingPiece.color, notation));
                setCurrentTurn(nextTurn);
                setGameStatus(nextStatus);
            }
            return;
        }

        // Select own piece
        if (clickedCell?.piece?.color === currentTurn) {
            setSelectedPos(clicked);
            setValidMoves(getLegalMoves(cells, clicked, enPassantTarget));
            return;
        }

        // Deselect
        setSelectedPos(null);
        setValidMoves([]);
    }, [cells, currentTurn, selectedPos, validMoves, enPassantTarget, gameStatus, promotionPending]);

    const resetGame = useCallback(() => {
        setCells(generateBoard());
        setCurrentTurn('white');
        setSelectedPos(null);
        setValidMoves([]);
        setEnPassantTarget(null);
        setGameStatus('playing');
        setCapturedByWhite([]);
        setCapturedByBlack([]);
        setPromotionPending(null);
        setMoveHistory([]);
        setPromotionBaseNotation(null);
    }, []);

    const confirmPromotion = useCallback((pieceType: PieceType) => {
        if (!promotionPending) return;
        const color = currentTurn;
        const newCells = cells.map(cell =>
            samePos(cell, promotionPending)
                ? { ...cell, piece: { type: pieceType, color } }
                : cell,
        );
        const nextTurn: Color = currentTurn === 'white' ? 'black' : 'white';
        const nextStatus = getGameStatus(newCells, nextTurn, enPassantTarget);
        const checkSym = nextStatus === 'checkmate' ? '#' : nextStatus === 'check' ? '+' : '';
        const promoLetter = PROMO_LETTERS[pieceType];
        const fullNotation = (promotionBaseNotation ?? '') + `=${promoLetter}${checkSym}`;

        setMoveHistory(prev => {
            const last = prev[prev.length - 1];
            if (!last) return prev;
            const colorField = color === 'white' ? 'white' : 'black' as const;
            if (typeof last[colorField] === 'string' && (last[colorField] as string).includes('=?')) {
                return [...prev.slice(0, -1), { ...last, [colorField]: fullNotation }];
            }
            return prev;
        });

        setCells(newCells);
        setCurrentTurn(nextTurn);
        setPromotionPending(null);
        setPromotionBaseNotation(null);
        setGameStatus(nextStatus);
    }, [promotionPending, currentTurn, cells, enPassantTarget, promotionBaseNotation]);

    return {
        cells,
        currentTurn,
        selectedPos,
        validMoves,
        handleCellClick,
        gameStatus,
        capturedByWhite,
        capturedByBlack,
        promotionPending,
        confirmPromotion,
        resetGame,
        moveHistory,
    };
}
