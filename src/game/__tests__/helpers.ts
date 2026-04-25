import { type Cell, type CellColor, type Piece, type PieceType, type Position } from '../types';
import { isValidCell } from '../board';

export function pos(q: number, r: number): Position {
    return { q, r };
}

export function w(type: PieceType): Piece {
    return { type, color: 'white' };
}

export function b(type: PieceType): Piece {
    return { type, color: 'black' };
}

// Build full 91-cell board populated only with the given pieces
export function makeBoard(pieces: Array<[Position, Piece]>): Cell[] {
    const cells: Cell[] = [];
    for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {
            if (!isValidCell(q, r)) continue;
            const entry = pieces.find(([p]) => p.q === q && p.r === r);
            const cellColor: CellColor = 'light';
            cells.push({ q, r, cellColor, piece: entry ? entry[1] : null });
        }
    }
    return cells;
}

// All 91 valid cell coordinates on Glinski's board
export function allValidCells(): Position[] {
    const result: Position[] = [];
    for (let q = -5; q <= 5; q++)
        for (let r = -5; r <= 5; r++)
            if (isValidCell(q, r)) result.push({ q, r });
    return result;
}
