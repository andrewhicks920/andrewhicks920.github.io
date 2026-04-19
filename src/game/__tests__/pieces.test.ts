import { describe, it, expect } from 'vitest';
import { getValidMoves } from '../pieces';
import { isValidCell } from '../board';
import { pos, w, b, makeBoard, allValidCells } from './helpers';

describe('Rook movement', () => {
    it('from center (0,0) on empty board has 30 moves along 6 axes', () => {
        const board = makeBoard([[pos(0, 0), w('rook')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves).toHaveLength(30);
    });

    it('slides all 6 orthogonal directions', () => {
        const board = makeBoard([[pos(0, 0), w('rook')]]);
        const moves = getValidMoves(board, pos(0, 0));
        // Check one cell in each direction is reachable
        expect(moves.some(m => m.q === 0 && m.r === 1)).toBe(true);  // +r
        expect(moves.some(m => m.q === 0 && m.r === -1)).toBe(true); // -r
        expect(moves.some(m => m.q === 1 && m.r === 0)).toBe(true);  // +q
        expect(moves.some(m => m.q === -1 && m.r === 0)).toBe(true); // -q
        expect(moves.some(m => m.q === 1 && m.r === -1)).toBe(true); // +s
        expect(moves.some(m => m.q === -1 && m.r === 1)).toBe(true); // -s
    });

    it('is blocked by a friendly piece and cannot capture it', () => {
        const board = makeBoard([
            [pos(0, 0), w('rook')],
            [pos(0, 3), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 0 && m.r === 3)).toBe(false); // blocked
        expect(moves.some(m => m.q === 0 && m.r === 4)).toBe(false); // beyond block
        expect(moves.some(m => m.q === 0 && m.r === 2)).toBe(true);  // before block
    });

    it('can capture an enemy piece but not slide beyond it', () => {
        const board = makeBoard([
            [pos(0, 0), w('rook')],
            [pos(0, 3), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 0 && m.r === 3)).toBe(true);  // capture
        expect(moves.some(m => m.q === 0 && m.r === 4)).toBe(false); // beyond enemy
    });

    it('cannot move to a square occupied by a friendly piece', () => {
        const board = makeBoard([
            [pos(0, 0), w('rook')],
            [pos(0, 1), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.every(m => !(m.q === 0 && m.r === 1))).toBe(true);
    });

    it('from every valid cell on empty board, all returned moves stay in bounds', () => {
        for (const cell of allValidCells()) {
            const board = makeBoard([[cell, w('rook')]]);
            const moves = getValidMoves(board, cell);
            for (const m of moves)
                expect(isValidCell(m.q, m.r)).toBe(true);
        }
    });

    it('from corner (5,0) has fewer than 30 moves', () => {
        const board = makeBoard([[pos(5, 0), w('rook')]]);
        const moves = getValidMoves(board, pos(5, 0));
        expect(moves.length).toBeLessThan(30);
    });

    it('returns empty array when no piece is at the given position', () => {
        const board = makeBoard([]);
        expect(getValidMoves(board, pos(0, 0))).toHaveLength(0);
    });
});

describe('Bishop movement', () => {
    it('from center (0,0) on empty board has 12 moves along 6 diagonals', () => {
        const board = makeBoard([[pos(0, 0), w('bishop')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves).toHaveLength(12);
    });

    it('slides all 6 diagonal directions from center', () => {
        const board = makeBoard([[pos(0, 0), w('bishop')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 1 && m.r === 1)).toBe(true);
        expect(moves.some(m => m.q === -1 && m.r === -1)).toBe(true);
        expect(moves.some(m => m.q === 2 && m.r === -1)).toBe(true);
        expect(moves.some(m => m.q === -2 && m.r === 1)).toBe(true);
        expect(moves.some(m => m.q === 1 && m.r === -2)).toBe(true);
        expect(moves.some(m => m.q === -1 && m.r === 2)).toBe(true);
    });

    it('is blocked by a friendly piece', () => {
        const board = makeBoard([
            [pos(0, 0), w('bishop')],
            [pos(2, 2), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        // (1,1) is reachable but (2,2) is blocked by own piece
        expect(moves.some(m => m.q === 1 && m.r === 1)).toBe(true);
        expect(moves.some(m => m.q === 2 && m.r === 2)).toBe(false);
    });

    it('can capture an enemy piece but not slide beyond it', () => {
        const board = makeBoard([
            [pos(0, 0), w('bishop')],
            [pos(1, 1), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 1 && m.r === 1)).toBe(true);
        expect(moves.some(m => m.q === 2 && m.r === 2)).toBe(false);
    });

    it('from every valid cell on empty board, all returned moves stay in bounds', () => {
        for (const cell of allValidCells()) {
            const board = makeBoard([[cell, w('bishop')]]);
            const moves = getValidMoves(board, cell);
            for (const m of moves)
                expect(isValidCell(m.q, m.r)).toBe(true);
        }
    });

    it('[2,-1] and [1,-2] directions work correctly from center', () => {
        const board = makeBoard([[pos(0, 0), w('bishop')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 2 && m.r === -1)).toBe(true);
        expect(moves.some(m => m.q === 1 && m.r === -2)).toBe(true);
    });

    it('never returns a square occupied by a friendly piece', () => {
        const board = makeBoard([
            [pos(0, 0), w('bishop')],
            [pos(1, 1), w('pawn')],
            [pos(-1, -1), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.every(m => !(m.q === 1 && m.r === 1))).toBe(true);
        expect(moves.every(m => !(m.q === -1 && m.r === -1))).toBe(true);
    });

    it('from corner (5,-5) on empty board has moves only inward', () => {
        const board = makeBoard([[pos(5, -5), w('bishop')]]);
        const moves = getValidMoves(board, pos(5, -5));
        for (const m of moves)
            expect(isValidCell(m.q, m.r)).toBe(true);
    });
});

describe('Queen movement', () => {
    it('from center (0,0) on empty board has 42 moves (30 rook + 12 bishop)', () => {
        const board = makeBoard([[pos(0, 0), w('queen')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves).toHaveLength(42);
    });

    it('blocked by friendly piece in one direction, unrestricted in others', () => {
        const board = makeBoard([
            [pos(0, 0), w('queen')],
            [pos(0, 2), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 0 && m.r === 1)).toBe(true);
        expect(moves.some(m => m.q === 0 && m.r === 2)).toBe(false); // blocked
        expect(moves.some(m => m.q === 0 && m.r === -1)).toBe(true); // opposite free
    });

    it('can capture along rook lines', () => {
        const board = makeBoard([
            [pos(0, 0), w('queen')],
            [pos(3, 0), b('rook')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 3 && m.r === 0)).toBe(true);
    });

    it('can capture along bishop diagonals', () => {
        const board = makeBoard([
            [pos(0, 0), w('queen')],
            [pos(2, -1), b('rook')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 2 && m.r === -1)).toBe(true);
    });

    it('from every valid cell on empty board, all returned moves stay in bounds', () => {
        for (const cell of allValidCells()) {
            const board = makeBoard([[cell, w('queen')]]);
            const moves = getValidMoves(board, cell);
            for (const m of moves)
                expect(isValidCell(m.q, m.r)).toBe(true);
        }
    });

    it('has zero moves when surrounded by friendly pieces in all directions', () => {
        const board = makeBoard([
            [pos(0, 0), w('queen')],
            [pos(0, 1), w('pawn')],   [pos(0, -1), w('pawn')],
            [pos(1, 0), w('pawn')],   [pos(-1, 0), w('pawn')],
            [pos(1, -1), w('pawn')],  [pos(-1, 1), w('pawn')],
            [pos(1, 1), w('pawn')],   [pos(-1, -1), w('pawn')],
            [pos(2, -1), w('pawn')],  [pos(-2, 1), w('pawn')],
            [pos(1, -2), w('pawn')],  [pos(-1, 2), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves).toHaveLength(0);
    });
});

describe('King movement', () => {
    it('from center (0,0) on empty board has exactly 12 moves', () => {
        const board = makeBoard([[pos(0, 0), w('king')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves).toHaveLength(12);
    });

    it('from a board corner has fewer than 12 moves', () => {
        const board = makeBoard([[pos(5, 0), w('king')]]);
        const moves = getValidMoves(board, pos(5, 0));
        expect(moves.length).toBeLessThan(12);
        for (const m of moves) expect(isValidCell(m.q, m.r)).toBe(true);
    });

    it('can capture an adjacent enemy piece', () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 1), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 0 && m.r === 1)).toBe(true);
    });

    it('cannot move to a square occupied by a friendly piece', () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 1), w('rook')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.every(m => !(m.q === 0 && m.r === 1))).toBe(true);
    });

    it('from every valid cell on empty board, all returned moves stay in bounds', () => {
        for (const cell of allValidCells()) {
            const board = makeBoard([[cell, w('king')]]);
            const moves = getValidMoves(board, cell);
            for (const m of moves)
                expect(isValidCell(m.q, m.r)).toBe(true);
        }
    });

    it('moves cover all 12 direction offsets from center', () => {
        const board = makeBoard([[pos(0, 0), w('king')]]);
        const moves = getValidMoves(board, pos(0, 0));
        const expected = [
            pos(0,1), pos(0,-1), pos(1,0), pos(-1,0), pos(1,-1), pos(-1,1),
            pos(1,1), pos(-1,-1), pos(2,-1), pos(-2,1), pos(1,-2), pos(-1,2),
        ];
        for (const e of expected)
            expect(moves.some(m => m.q === e.q && m.r === e.r)).toBe(true);
    });

    it('has at least 1 move from every valid cell on empty board (never trapped)', () => {
        for (const cell of allValidCells()) {
            const board = makeBoard([[cell, w('king')]]);
            const moves = getValidMoves(board, cell);
            expect(moves.length).toBeGreaterThan(0);
        }
    });
});

describe('Knight movement', () => {
    it('from center (0,0) on empty board has all 12 jumps (all in bounds)', () => {
        const board = makeBoard([[pos(0, 0), w('knight')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves).toHaveLength(12);
    });

    it('from a corner has fewer than 12 jumps', () => {
        const board = makeBoard([[pos(5, 0), w('knight')]]);
        const moves = getValidMoves(board, pos(5, 0));
        expect(moves.length).toBeLessThan(12);
        for (const m of moves) expect(isValidCell(m.q, m.r)).toBe(true);
    });

    it('can capture an enemy on a jump square', () => {
        const board = makeBoard([
            [pos(0, 0), w('knight')],
            [pos(3, -1), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 3 && m.r === -1)).toBe(true);
    });

    it('cannot capture a friendly piece on a jump square', () => {
        const board = makeBoard([
            [pos(0, 0), w('knight')],
            [pos(3, -1), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.every(m => !(m.q === 3 && m.r === -1))).toBe(true);
    });

    it('jumps over pieces (intervening pieces do not block)', () => {
        const board = makeBoard([
            [pos(0, 0), w('knight')],
            [pos(1, 0), b('rook')],  // directly adjacent — should not block jump to (3,-1)
            [pos(2, 0), b('rook')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 3 && m.r === -1)).toBe(true);
    });

    it('from every valid cell on empty board, all returned moves stay in bounds', () => {
        for (const cell of allValidCells()) {
            const board = makeBoard([[cell, w('knight')]]);
            const moves = getValidMoves(board, cell);
            for (const m of moves)
                expect(isValidCell(m.q, m.r)).toBe(true);
        }
    });

    it('has symmetric move counts from symmetric positions', () => {
        // (1,0) and (-1,0) are symmetric across center — should have same count
        const b1 = makeBoard([[pos(1, 0), w('knight')]]);
        const b2 = makeBoard([[pos(-1, 0), w('knight')]]);
        expect(getValidMoves(b1, pos(1, 0))).toHaveLength(
            getValidMoves(b2, pos(-1, 0)).length
        );
    });
});

describe('Pawn movement', () => {
    // White moves in +r direction; starting rank for q=0 is r = -(max(0,0)+1) = -1

    it('white pawn advances one square forward', () => {
        const board = makeBoard([[pos(0, 0), w('pawn')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 0 && m.r === 1)).toBe(true);
    });

    it('white pawn on starting rank can advance two squares', () => {
        const board = makeBoard([[pos(0, -1), w('pawn')]]);
        const moves = getValidMoves(board, pos(0, -1));
        expect(moves.some(m => m.q === 0 && m.r === 1)).toBe(true); // double advance
        expect(moves.some(m => m.q === 0 && m.r === 0)).toBe(true); // single advance
    });

    it('white pawn is blocked when the square ahead is occupied', () => {
        const board = makeBoard([
            [pos(0, 0), w('pawn')],
            [pos(0, 1), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.every(m => !(m.q === 0 && m.r === 1))).toBe(true);
    });

    it('white pawn cannot double-advance when the intermediate square is blocked', () => {
        const board = makeBoard([
            [pos(0, -1), w('pawn')],
            [pos(0, 0), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, -1));
        expect(moves).toHaveLength(0); // first square blocked → no moves
    });

    it('white pawn cannot double-advance when the landing square is blocked', () => {
        const board = makeBoard([
            [pos(0, -1), w('pawn')],
            [pos(0, 1), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, -1));
        // can still advance one square
        expect(moves.some(m => m.q === 0 && m.r === 0)).toBe(true);
        expect(moves.every(m => !(m.q === 0 && m.r === 1))).toBe(true);
    });

    it('white pawn captures diagonally when enemy is present', () => {
        // White capture dirs: [+1,0] and [-1,+1]
        const board = makeBoard([
            [pos(0, 0), w('pawn')],
            [pos(1, 0), b('pawn')],   // [+1,0]
            [pos(-1, 1), b('pawn')],  // [-1,+1]
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 1 && m.r === 0)).toBe(true);
        expect(moves.some(m => m.q === -1 && m.r === 1)).toBe(true);
    });

    it('white pawn does not capture diagonally onto an empty square', () => {
        const board = makeBoard([[pos(0, 0), w('pawn')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.every(m => !(m.q === 1 && m.r === 0))).toBe(true);
        expect(moves.every(m => !(m.q === -1 && m.r === 1))).toBe(true);
    });

    it('black pawn advances in the −r direction', () => {
        const board = makeBoard([[pos(0, 0), b('pawn')]]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === 0 && m.r === -1)).toBe(true);
        expect(moves.every(m => !(m.q === 0 && m.r === 1))).toBe(true);
    });

    it('black pawn on starting rank can double-advance', () => {
        // Black starting rank for q=0: r = max(1-0,1) = 1
        const board = makeBoard([[pos(0, 1), b('pawn')]]);
        const moves = getValidMoves(board, pos(0, 1));
        expect(moves.some(m => m.q === 0 && m.r === -1)).toBe(true); // double
        expect(moves.some(m => m.q === 0 && m.r === 0)).toBe(true);  // single
    });

    it('black pawn captures diagonally toward its movement direction', () => {
        // Black capture dirs: [-1,0] and [+1,-1]
        const board = makeBoard([
            [pos(0, 0), b('pawn')],
            [pos(-1, 0), w('pawn')],
            [pos(1, -1), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 0));
        expect(moves.some(m => m.q === -1 && m.r === 0)).toBe(true);
        expect(moves.some(m => m.q === 1 && m.r === -1)).toBe(true);
    });

    it('en passant: white captures a black pawn that just double-advanced', () => {
        // Black pawn was at (1,3), double-moved to (1,1), enPassantTarget = (1,2)
        // White pawn at (0,2) can capture to (1,2) (capture dir [+1,0])
        const epTarget = pos(1, 2);
        const board = makeBoard([
            [pos(0, 2), w('pawn')],
            [pos(1, 1), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 2), epTarget);
        expect(moves.some(m => m.q === 1 && m.r === 2)).toBe(true);
    });

    it('en passant: black captures a white pawn that just double-advanced', () => {
        // White pawn double-moved to (1,-1), enPassantTarget = (1,0)
        // Black pawn at (0,0), capture dir [-1,0] → (-1,0), but [+1,-1] → (1,-1)...
        // Actually: black at (2,0) uses [-1,0] → (1,0) = epTarget
        const epTarget = pos(1, 0);
        const board = makeBoard([
            [pos(2, 0), b('pawn')],
            [pos(1, -1), w('pawn')],
        ]);
        const moves = getValidMoves(board, pos(2, 0), epTarget);
        expect(moves.some(m => m.q === 1 && m.r === 0)).toBe(true);
    });

    it('no en passant move when enPassantTarget is null', () => {
        const board = makeBoard([
            [pos(0, 2), w('pawn')],
            [pos(1, 1), b('pawn')],
        ]);
        const moves = getValidMoves(board, pos(0, 2), null);
        // Without epTarget, (1,2) should not be available (empty square)
        expect(moves.every(m => !(m.q === 1 && m.r === 2))).toBe(true);
    });

    it('pawn not on starting rank cannot double-advance', () => {
        // White pawn at (0,2) — not starting rank
        const board = makeBoard([[pos(0, 2), w('pawn')]]);
        const moves = getValidMoves(board, pos(0, 2));
        expect(moves).toHaveLength(1); // only single advance
        expect(moves[0]).toEqual(pos(0, 3));
    });
});

