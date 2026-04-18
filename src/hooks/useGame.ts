import { useState, useCallback, useEffect } from 'react';
import { type Cell, type Color, type Position } from '../game/types';
import { generateBoard, samePos} from '../game/board';
import { getValidMoves } from '../game/pieces';


export function useGame() {
    const [cells, setCells] = useState<Cell[]>(() => generateBoard());
    const [currentTurn, setCurrentTurn] = useState<Color>('white');
    const [selectedPos, setSelectedPos] = useState<Position | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);
    const [enPassantTarget, setEnPassantTarget] = useState<Position | null>(null);


    // This document listener technically catches everything, but stopPropagation pokes a hole in that net
    // specifically for hex tile clicks
    useEffect(() => {
        const deselect = () => {
            setSelectedPos(null);
            setValidMoves([]);
        };
        document.addEventListener('click', deselect);
        return () => document.removeEventListener('click', deselect);
    }, []); // runs once — stable setters don't need deps


    const handleCellClick = useCallback((q: number, r: number) => {
        const clicked: Position = { q, r };
        const clickedCell = cells.find(c => c.q === q && c.r === r);


        // A valid move destination was clicked
        if (selectedPos && validMoves.some(m => samePos(m, clicked))) {
            const movingPiece = cells.find(c => samePos(c, selectedPos))!.piece!;

            // Set en passant target when a pawn advances two squares.
            const isPawnDouble = movingPiece.type === 'pawn' && Math.abs(clicked.r - selectedPos.r) === 2;

            setEnPassantTarget(
                isPawnDouble
                    ? { q: clicked.q, r: (selectedPos.r + clicked.r) / 2 }
                    : null,
            );

            setCells(prev =>
                applyMove(prev, selectedPos, clicked, enPassantTarget, movingPiece.color),
            );

            setCurrentTurn(t => (t === 'white' ? 'black' : 'white'));
            setSelectedPos(null);
            setValidMoves([]);
            return;
        }

        // Clicking own piece — select (or re-select) it
        if (clickedCell?.piece?.color === currentTurn) {
            setSelectedPos(clicked);
            setValidMoves(getValidMoves(cells, clicked, enPassantTarget));
            return;
        }

        // Clicking anything else — deselect
        setSelectedPos(null);
        setValidMoves([]);
    }, [cells, currentTurn, selectedPos, validMoves, enPassantTarget]);

    return { cells, currentTurn, selectedPos, validMoves, handleCellClick };
}

function applyMove(cells: Cell[], from: Position, to: Position, enPassantTarget: Position | null, movingColor: Color,): Cell[] {
    // For en passant: the captured pawn sits one step BEHIND the target square
    // (opposite to the moving pawn's direction).
    const epCapturedR = enPassantTarget ? enPassantTarget.r + (movingColor === 'white' ? -1 : 1) : null;

    const isEpCapture = (cell: Cell) =>
        enPassantTarget !== null && samePos(to, enPassantTarget) && cell.q === enPassantTarget.q && cell.r === epCapturedR;

    const piece = cells.find(c => samePos(c, from))!.piece;

    return cells.map(cell => {
        if (samePos(cell, from))  return { ...cell, piece: null };      // lift
        if (samePos(cell, to))    return { ...cell, piece };            // place
        if (isEpCapture(cell))    return { ...cell, piece: null };       // remove captured pawn
        return cell;
    });
}