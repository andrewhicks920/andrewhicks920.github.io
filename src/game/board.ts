import {type Cell, type CellColor, type Color, type Piece, type PieceType, type Position} from './types';

// A cell (q, r) is on Glinski's 91-cell board when all three cube coords stay within ±5.
// Cube coords: x=q, z=r, y=-q-r. Constraint: max(|q|, |r|, |q+r|) <= 5.
export function isValidCell(q: number, r: number): boolean {
    return Math.abs(q) <= 5 && Math.abs(r) <= 5 && Math.abs(q + r) <= 5;
}

// Color based on (q - r) mod 3 which guarantees bishops never change color.
function getCellColor(q: number, r: number): CellColor {
    const mod = ((q - r) % 3 + 3) % 3;

    if (mod === 0) return 'light';
    if (mod === 1) return 'mid';
    return 'dark';
}

// Generate all 91 cells of Glinski's board with no pieces on them.
export function generateBoard(): Cell[] {
    const cells: Cell[] = [];

    for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {

            if (isValidCell(q, r))
                cells.push({q, r, cellColor: getCellColor(q, r), piece: null});
        }
    }

    const pieces = getStartingPieces();
    for (const cell of cells)
        cell.piece = pieces.get(posKey(cell)) ?? null;

    return cells;
}

// Flat-top hexagon pixel position. Negating y so rank increases upward on screen.
export function toPixel(q: number, r: number, size: number): { x: number; y: number } {
    return {
        x: size * (3 / 2) * q,
        y: -size * Math.sqrt(3) * (r + q / 2),
    };
}

// Returns SVG polygon points string for a flat-top hexagon centered at (cx, cy).
export function hexPoints(cx: number, cy: number, size: number): string {
    const h = (size * Math.sqrt(3)) / 2;
    return [
        [cx + size, cy],
        [cx + size / 2, cy + h],
        [cx - size / 2, cy + h],
        [cx - size, cy],
        [cx - size / 2, cy - h],
        [cx + size / 2, cy - h],
    ]
        .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
        .join(' ');
}

// q: -5 (file a) to +5 (file l), skipping j.
export function fileLabel(q: number): string {
    return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l'][q + 5];
}

export function posKey(pos: Position): string {
    return `${pos.q},${pos.r}`;
}

export function samePos(a: Position, b: Position): boolean {
    return a.q === b.q && a.r === b.r;
}

// Converts a file letter + rank number to (q, r) coordinates.
// file: 'a'–'l' (no 'j').  rank: 1–11.
export function fileRankToPos(file: string, rank: number): Position {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l'];
    const q = files.indexOf(file) - 5;
    const r = rank - Math.min(q, 0) - 6;
    return { q, r };
}

export function getStartingPieces(): Map<string, Piece> {
    const pieces = new Map<string, Piece>();

    function place(file: string, rank: number, type: PieceType, color: Color) {
        const pos = fileRankToPos(file, rank);
        pieces.set(posKey(pos), { type, color });
    }

    place('f', 1, 'bishop', 'white');
    place('e', 1, 'queen', 'white');
    place('g', 1, 'king', 'white');
    place('d', 1, 'knight', 'white');
    place('f', 2, 'bishop', 'white');
    place('h', 1, 'knight', 'white');
    place('c', 1, 'rook', 'white');
    place('i', 1, 'rook', 'white');
    place('b', 1, 'pawn', 'white');
    place('k', 1, 'pawn', 'white');
    place('f', 3, 'bishop', 'white');
    place('c', 2, 'pawn', 'white');
    place('d', 3, 'pawn', 'white');
    place('e', 4, 'pawn', 'white');
    place('f', 5, 'pawn', 'white');
    place('g', 4, 'pawn', 'white');
    place('h', 3, 'pawn', 'white');
    place('i', 2, 'pawn', 'white');


    place('f', 11, 'bishop', 'black');
    place('e', 10, 'queen', 'black');
    place('g', 10, 'king', 'black');
    place('d', 9, 'knight', 'black');
    place('f', 10, 'bishop', 'black');
    place('h', 9, 'knight', 'black');
    place('c', 8, 'rook', 'black');
    place('i', 8, 'rook', 'black');
    place('b', 7, 'pawn', 'black');
    place('k', 7, 'pawn', 'black');
    place('f', 9, 'bishop', 'black');
    place('c', 7, 'pawn', 'black');
    place('d', 7, 'pawn', 'black');
    place('e', 7, 'pawn', 'black');
    place('f', 7, 'pawn', 'black');
    place('g', 7, 'pawn', 'black');
    place('h', 7, 'pawn', 'black');
    place('i', 7, 'pawn', 'black');

    return pieces;

}