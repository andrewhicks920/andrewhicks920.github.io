import { useState, useCallback } from 'react';
import { type Cell, type Color, type Piece, type PieceType, type Position } from '../game/types';
import { generateBoard, samePos, applyMove } from '../game/board';
import { getLegalMoves, getGameStatus, isPromotionSquare } from '../game/gameLogic';

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

    const handleCellClick = useCallback((q: number, r: number) => {
        if (promotionPending) return;
        if (gameStatus === 'checkmate' || gameStatus === 'stalemate') return;

        const clicked: Position = { q, r };
        const clickedCell = cells.find(c => c.q === q && c.r === r);

        // Execute a valid move
        if (selectedPos && validMoves.some(m => samePos(m, clicked))) {
            const movingPiece = cells.find(c => samePos(c, selectedPos))!.piece!;

            // New en passant target if pawn advances two squares
            const isPawnDouble =
                movingPiece.type === 'pawn' && Math.abs(clicked.r - selectedPos.r) === 2;
            const newEnPassantTarget: Position | null = isPawnDouble
                ? { q: clicked.q, r: (selectedPos.r + clicked.r) / 2 }
                : null;

            // Track the captured piece (normal capture or en passant)
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
                setPromotionPending(clicked);
                // Turn switches only after the player picks a piece
            } else {
                setCurrentTurn(nextTurn);
                setGameStatus(getGameStatus(newCells, nextTurn, newEnPassantTarget));
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
        setCells(newCells);
        setCurrentTurn(nextTurn);
        setPromotionPending(null);
        setGameStatus(getGameStatus(newCells, nextTurn, enPassantTarget));
    }, [promotionPending, currentTurn, cells, enPassantTarget]);

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
    };
}
