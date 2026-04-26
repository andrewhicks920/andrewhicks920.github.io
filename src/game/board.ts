import {type Cell, type CellColor, type Color, type Piece, type PieceType, type Position} from './types';

/** Ordered file labels for Glinski's board (`a`–`l`, skipping `j`), left to right. */
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l'];

/**
 * Returns the en-passant target square after a pawn double-push, or null.
 * The target is the square the capturing pawn lands on (the skipped square),
 * not the square of the captured pawn.
 */
export function computeEnPassantTarget(from: Position, to: Position, piece: Piece | null | undefined,): Position | null {
    if (piece?.type !== 'pawn') return null;

    if (Math.abs(to.r - from.r) !== 2) return null;

    return { q: to.q, r: (from.r + to.r) / 2 };
}

/**
 * Returns a new cell array with `piece` moved from `from` to `to`.
 * Handles en-passant capture by clearing the captured pawn's cell automatically.
 *
 * @param enPassantTarget - The landing square for an en-passant capture, or `null`.
 * @param movingColor - Side making the move (used to find the captured pawn's rank).
 */
export function applyMove(cells: Cell[], from: Position, to: Position, enPassantTarget: Position | null, movingColor: Color): Cell[] {
    const epCapturedR = enPassantTarget ? enPassantTarget.r + (movingColor === 'white' ? -1 : 1) : null;

    const isEpCapture = (cell: Cell) =>
        enPassantTarget !== null &&
        samePos(to, enPassantTarget) &&
        cell.q === enPassantTarget.q &&
        cell.r === epCapturedR;

    const fromCell = cells.find(c => samePos(c, from));
    if (!fromCell) throw new Error(`applyMove: no cell at (${from.q},${from.r})`);
    const piece = fromCell.piece;

    return cells.map(cell => {
        if (samePos(cell, from)) return { ...cell, piece: null };
        if (samePos(cell, to))   return { ...cell, piece };
        if (isEpCapture(cell))   return { ...cell, piece: null };
        return cell;
    });
}

/**
 * Returns `true` when `(q, r)` lies on Glinski's 91-cell board.
 * A cell is valid when all three cube coordinates (`q`, `r`, `s = −q−r`) are within `±5`:
 * `max(|q|, |r|, |q+r|) ≤ 5`.
 */
export function isValidCell(q: number, r: number): boolean {
    return Math.abs(q) <= 5 && Math.abs(r) <= 5 && Math.abs(q + r) <= 5;
}

/**
 * Returns the visual shading for cell `(q, r)` based on `(q − r) mod 3`.
 * This formula guarantees that bishops always remain on a single shading.
 */
function getCellColor(q: number, r: number): CellColor {
    const mod = ((q - r) % 3 + 3) % 3;

    if (mod === 0) return 'light';
    if (mod === 1) return 'mid';
    return 'dark';
}

/** Generates all 91 cells of Glinski's board populated with the standard starting pieces. */
export function generateBoard(): Cell[] {
    const cells: Cell[] = [];

    for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {

            if (isValidCell(q, r)) {
                const cellColor: CellColor = getCellColor(q, r);
                cells.push({q, r, cellColor, piece: null});
            }
        }
    }

    const pieces = getStartingPieces();
    for (const cell of cells)
        cell.piece = pieces.get(posKey(cell)) ?? null;

    return cells;
}

/**
 * Converts axial coordinates `(q, r)` to pixel coordinates for a flat-top hexagon layout.
 * The y-axis is negated so that rank numbers increase upward on screen.
 *
 * @param size - Distance from the center to any corner (hex radius).
 * @returns Pixel center `{x, y}` of the hex.
 */
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


/** Returns a string key for `pos` in the form `"q,r"`, used as a Map key. */
export function posKey(pos: Position): string {
    return `${pos.q},${pos.r}`;
}

/** Build an O(1) lookup map from a Cell array, keyed by posKey. */
export function buildCellMap(cells: Cell[]): Map<string, Cell> {
    const map = new Map<string, Cell>();
    for (const cell of cells) map.set(posKey(cell), cell);
    return map;
}

/** Returns `true` when two positions share the same axial coordinates. */
export function samePos(a: Position, b: Position): boolean {
    return a.q === b.q && a.r === b.r;
}



/**
 * Returns the standard Glinski starting position as a piece map.
 * Uses JAN notation: `/`-separated segments, one per file (`a`–`l`), rank 1 upward.
 * Uppercase = white, lowercase = black, digits = consecutive empty cells.
 */
export function getStartingPieces(): Map<string, Piece> {
    return parseJan('6/P5p/RP4pr/N1P3p1n/Q2P2p2q/BBB1P1p1bbb/K2P2p2k/N1P3p1n/RP4pr/P5p/6');
}


const PIECE_FROM_CHAR: Record<string, PieceType> = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king',
};

/**
 * Parses a JAN string into a piece map.
 * Segments are separated by `/`, one per file (a–l), read from rank 1 upward.
 * Uppercase letters = white, lowercase = black. Digits = consecutive empty cells.
 *
 * @param jan - The JAN string to parse (must have exactly 11 `/`-separated segments)
 * @returns Map of position keys to pieces
 */
export function parseJan(jan: string): Map<string, Piece> {
    const segments = jan.split('/');
    if (import.meta.env.DEV && segments.length !== 11)
        console.warn(`parseJan: expected 11 segments, got ${segments.length}`);

    const pieces = new Map<string, Piece>();

    segments.forEach((segment, i) => {
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