import { describe, it, expect } from 'vitest';
import { isValidCell, generateBoard, fileRankToPos, samePos, applyMove, posKey } from '../board';
import { pos, w, b, makeBoard, allValidCells } from './helpers';

describe('isValidCell', () => {
    it('accepts the center cell (0,0)', () => {
        expect(isValidCell(0, 0)).toBe(true);
    });

    it('accepts all 91 cells produced by generateBoard', () => {
        const cells = generateBoard();
        expect(cells).toHaveLength(91);
        for (const cell of cells)
            expect(isValidCell(cell.q, cell.r)).toBe(true);
    });

    it('rejects q = 6 (column out of range)', () => {
        expect(isValidCell(6, 0)).toBe(false);
    });

    it('rejects cells where |q+r| > 5', () => {
        expect(isValidCell(3, 3)).toBe(false);  // q+r = 6
        expect(isValidCell(-3, -3)).toBe(false); // q+r = -6
    });

    it('accepts all board corners', () => {
        // The 6 extreme corners of Glinski's board
        expect(isValidCell(5, 0)).toBe(true);
        expect(isValidCell(-5, 0)).toBe(true);
        expect(isValidCell(0, 5)).toBe(true);
        expect(isValidCell(0, -5)).toBe(true);
        expect(isValidCell(5, -5)).toBe(true);
        expect(isValidCell(-5, 5)).toBe(true);
    });
});

describe('generateBoard', () => {
    it('produces exactly 91 cells', () => {
        expect(generateBoard()).toHaveLength(91);
    });

    it('contains no duplicate positions', () => {
        const cells = generateBoard();
        const keys = cells.map(c => posKey(c));
        expect(new Set(keys).size).toBe(91);
    });

    it('white has exactly 9 pawns', () => {
        const cells = generateBoard();
        const whitePawns = cells.filter(c => c.piece?.color === 'white' && c.piece.type === 'pawn');
        expect(whitePawns).toHaveLength(9);
    });

    it('black has exactly 9 pawns', () => {
        const cells = generateBoard();
        const blackPawns = cells.filter(c => c.piece?.color === 'black' && c.piece.type === 'pawn');
        expect(blackPawns).toHaveLength(9);
    });

    it('white has 18 pieces total (9 pawns + 3 bishops + queen + king + 2 knights + 2 rooks)', () => {
        const cells = generateBoard();
        const white = cells.filter(c => c.piece?.color === 'white');
        expect(white).toHaveLength(18);
    });

    it('black mirrors white in total piece count', () => {
        const cells = generateBoard();
        const black = cells.filter(c => c.piece?.color === 'black');
        expect(black).toHaveLength(18);
    });

    it('white has 3 bishops, 1 queen, 1 king, 2 knights, 2 rooks', () => {
        const cells = generateBoard();
        const count = (type: string) =>
            cells.filter(c => c.piece?.color === 'white' && c.piece.type === type).length;
        expect(count('bishop')).toBe(3);
        expect(count('queen')).toBe(1);
        expect(count('king')).toBe(1);
        expect(count('knight')).toBe(2);
        expect(count('rook')).toBe(2);
    });
});

describe('fileRankToPos', () => {
    it("'f',6 → (0,0): center of the board", () => {
        expect(fileRankToPos('f', 6)).toEqual(pos(0, 0));
    });

    it("'a',1 → (-5,0): bottom-left corner", () => {
        expect(fileRankToPos('a', 1)).toEqual(pos(-5, 0));
    });

    it("'l',1 → (5,-5): bottom-right area", () => {
        // q=5, r=1 - min(5,0) - 6 = 1-0-6 = -5
        expect(fileRankToPos('l', 1)).toEqual(pos(5, -5));
    });
});

describe('samePos', () => {
    it('returns true for identical positions', () => {
        expect(samePos(pos(2, -3), pos(2, -3))).toBe(true);
    });

    it('returns false for different positions', () => {
        expect(samePos(pos(1, 0), pos(0, 1))).toBe(false);
    });
});

describe('applyMove', () => {
    it('clears the source square and fills the destination', () => {
        const board = makeBoard([[pos(0, 0), w('rook')]]);
        const result = applyMove(board, pos(0, 0), pos(0, 3), null, 'white');
        expect(result.find(c => samePos(c, pos(0, 0)))!.piece).toBeNull();
        expect(result.find(c => samePos(c, pos(0, 3)))!.piece).toEqual(w('rook'));
    });

    it('removes the captured piece on a normal capture', () => {
        const board = makeBoard([
            [pos(0, 0), w('rook')],
            [pos(0, 3), b('pawn')],
        ]);
        const result = applyMove(board, pos(0, 0), pos(0, 3), null, 'white');
        expect(result.find(c => samePos(c, pos(0, 3)))!.piece).toEqual(w('rook'));
    });

    it('removes the en-passant captured pawn from the correct square', () => {
        // White pawn at (1, 0), black pawn double-moved to (1, 1)
        // enPassantTarget = (1, 1) means landing square; captured pawn is at (1, 1-1) = (1, 0)
        // Wait — let's match useGame.ts logic:
        // Black double-moved from (1,3) to (1,1), enPassantTarget = (1,2)
        // White pawn at (0,2) captures to (1,2)
        // epCapturedR = 2 + (white ? -1 : 1) = 1 → captured black pawn at (1,1)
        const epTarget = pos(1, 2);
        const board = makeBoard([
            [pos(0, 2), w('pawn')],
            [pos(1, 1), b('pawn')],
        ]);
        const result = applyMove(board, pos(0, 2), epTarget, epTarget, 'white');
        expect(result.find(c => samePos(c, pos(1, 1)))!.piece).toBeNull();
        expect(result.find(c => samePos(c, epTarget))!.piece).toEqual(w('pawn'));
    });
});

describe('allValidCells helper', () => {
    it('produces exactly 91 cells', () => {
        expect(allValidCells()).toHaveLength(91);
    });
});
