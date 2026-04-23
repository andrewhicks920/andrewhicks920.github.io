import {type Cell, type CellColor, type Color, type Piece, type PieceType, type Position} from './types';

export function applyMove(cells: Cell[], from: Position, to: Position, enPassantTarget: Position | null, movingColor: Color): Cell[] {
    const epCapturedR = enPassantTarget ? enPassantTarget.r + (movingColor === 'white' ? -1 : 1) : null;

    const isEpCapture = (cell: Cell) =>
        enPassantTarget !== null &&
        samePos(to, enPassantTarget) &&
        cell.q === enPassantTarget.q &&
        cell.r === epCapturedR;

    const piece = cells.find(c => samePos(c, from))!.piece;

    return cells.map(cell => {
        if (samePos(cell, from)) return { ...cell, piece: null };
        if (samePos(cell, to))   return { ...cell, piece };
        if (isEpCapture(cell))   return { ...cell, piece: null };
        return cell;
    });
}

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

            if (isValidCell(q, r)) {
                const cellColor: CellColor = getCellColor(q, r);
                const piece = null;

                cells.push({q, r, cellColor, piece});
            }
        }
    }

    const pieces = getStartingPieces();
    for (const cell of cells)
        cell.piece = pieces.get(posKey(cell)) ?? null;

    return cells;
}

// Flat-top hexagon pixel position. Negating y so rank increases upward on screen.
export function toPixel(q: number, r: number, size: number): {x: number; y: number} {
    return {
        x: size * (3 / 2) * q,
        y: -size * Math.sqrt(3) * (r + q / 2),
    };
}


/**
 * Returns the 6 vertices of a flat-top hexagon centered at (cx, cy).
 * Vertices are in clockwise order starting from the right-middle point.
 *
 *         (5)      (6)
 *           \      /
 *            \    /
 *     (4) ---- cx,cy ---- (1)
 *            /    \
 *           /      \
 *         (3)      (2)
 *
 * @param cx - X coordinate of the hexagon center
 * @param cy - Y coordinate of the hexagon center
 * @param size - Distance from center to any flat side (hex radius)
 * @returns Array of [x, y] coordinate pairs
 */
export function hexVertices(cx: number, cy: number, size: number): [number, number][] {
    const h = (size * Math.sqrt(3)) / 2; // Vertical distance from center to top/bottom vertices
    return [
        [cx + size, cy],           // right-middle
        [cx + size / 2, cy + h],   // bottom-right
        [cx - size / 2, cy + h],   // bottom-left
        [cx - size, cy],           // left-middle
        [cx - size / 2, cy - h],   // top-left
        [cx + size / 2, cy - h],   // top-right
    ];
}

/**
 * Returns an SVG polygon points string for a flat-top hexagon centered at (cx, cy).
 *
 * @param cx - X coordinate of the hexagon center
 * @param cy - Y coordinate of the hexagon center
 * @param size - Distance from center to any corner (hex radius)
 * @returns Space-separated "x,y" pairs for use in an SVG `<polygon points="...">` attribute
 */
export function hexPoints(cx: number, cy: number, size: number): string {
    return hexVertices(cx, cy, size)
        .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
        .join(' ');
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



// FEN builds by ranks, but for hex style JAN will build by files (since ranks basically bend in our implementation)
// 6/P5P/RP4rp/N1P3p1n/Q2P2p2q/BBB1P1p1bbb/K2P2p2k/N1P3p1n/RP4rp/P5P/6
export function getStartingPieces(): Map<string, Piece> {
    return parseFen('6/P5p/RP4rp/N1P3p1n/Q2P2p2q/BBB1P1p1bbb/K2P2p2k/N1P3p1n/RP4rp/P5p/6');
}


const PIECE_FROM_CHAR: Record<string, PieceType> = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king',
};

/**
 * Parses a OAN string into a piece map.
 * Segments are separated by `/`, one per file (a–l), read from rank 1 upward.
 * Uppercase letters = white, lowercase = black. Digits = empty cells.
 *
 * @param fen - The OAN FEN string to parse
 * @returns Map of position keys to pieces
 */
export function parseFen(fen: string): Map<string, Piece> {
    const pieces = new Map<string, Piece>();

    fen.split('/').forEach((segment, i) => {
        const q = i - 5;
        let r = Math.max(-5, -5 - q);

        for (const char of segment) {
            if (/\d/.test(char)) {
                r += parseInt(char);
            }
            else {
                const color: Color = char === char.toUpperCase() ? 'white' : 'black';
                const type = PIECE_FROM_CHAR[char.toLowerCase()];
                pieces.set(posKey({ q, r }), { type, color });
                r++;
            }
        }
    });

    return pieces;
}