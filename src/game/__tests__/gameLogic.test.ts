import { describe, it, expect } from 'vitest';
import { isInCheck, getLegalMoves, getGameStatus, isPromotionSquare } from '../gameLogic';
import { generateBoard } from '../board';
import { pos, w, b, makeBoard } from './helpers';

describe('isInCheck', () => {
    it('detects check from a rook on the same file', () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 4), b('rook')],
        ]);
        expect(isInCheck(board, 'white')).toBe(true);
    });

    it('detects check from a bishop on a diagonal', () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(2, 2), b('bishop')],
        ]);
        expect(isInCheck(board, 'white')).toBe(true);
    });

    it('detects check from a queen along a rook line', () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(3, 0), b('queen')],
        ]);
        expect(isInCheck(board, 'white')).toBe(true);
    });

    it('detects check from a queen along a bishop diagonal', () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(-1, -1), b('queen')],
        ]);
        expect(isInCheck(board, 'white')).toBe(true);
    });

    it('detects check from a knight', () => {
        // Knight at (3,-1) can jump to (0,0)
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(3, -1), b('knight')],
        ]);
        expect(isInCheck(board, 'white')).toBe(true);
    });

    it('detects check from a black pawn attacking white king', () => {
        // Black pawn capture dirs: [-1,0] and [+1,-1]. Black at (1,0) covers (0,0) via [-1,0].
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(1, 0), b('pawn')],
        ]);
        expect(isInCheck(board, 'white')).toBe(true);
    });

    it('returns false when a friendly piece blocks the attack', () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 2), w('rook')],  // blocks sliding rook
            [pos(0, 4), b('rook')],
        ]);
        expect(isInCheck(board, 'white')).toBe(false);
    });

    it('returns false when no opponent attacks the king', () => {
        // Rook at (2,3) has no line to (0,0): q≠0, r≠0, q+r=5≠0
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(2, 3), b('rook')],
        ]);
        expect(isInCheck(board, 'white')).toBe(false);
    });

    it('black king can also be in check', () => {
        const board = makeBoard([
            [pos(0, 0), b('king')],
            [pos(0, -3), w('rook')],
        ]);
        expect(isInCheck(board, 'black')).toBe(true);
    });

    it('white not in check does not affect black check status', () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 3), b('king')],
        ]);
        expect(isInCheck(board, 'white')).toBe(false);
        expect(isInCheck(board, 'black')).toBe(false);
    });
});

describe('getLegalMoves', () => {
    it('a pinned rook cannot move off the pin line', () => {
        // White king at (0,0), white rook at (0,2), black rook at (0,4) — pin along r-axis
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 2), w('rook')],
            [pos(0, 4), b('rook')],
        ]);
        const moves = getLegalMoves(board, pos(0, 2), null);
        // Pinned rook can only move along q=0
        for (const m of moves)
            expect(m.q).toBe(0);
    });

    it('pinned bishop can capture the pinning piece to resolve the pin', () => {
        // King at (0,0), bishop at (1,1), enemy queen at (2,2) — pin along [+1,+1] diagonal
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(1, 1), w('bishop')],
            [pos(2, 2), b('queen')],
        ]);
        const moves = getLegalMoves(board, pos(1, 1), null);
        // Bishop can only capture (2,2) or retreat to (nothing) — queen is at 1 step away
        expect(moves.some(m => m.q === 2 && m.r === 2)).toBe(true);
        // Bishop cannot move off the diagonal (would expose king)
        for (const m of moves) {
            expect(m.q - m.r).toBe(0); // all moves stay on the q==r diagonal
        }
    });

    it('king cannot move into a square attacked by an enemy rook', () => {
        // Rook at (2,1) attacks entire r=1 row via [−1,0] / [+1,0]
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(2, 1), b('rook')],
        ]);
        const legalMoves = getLegalMoves(board, pos(0, 0), null);
        for (const m of legalMoves)
            expect(m.r).not.toBe(1);
    });

    it('a piece can block check by interposing between king and attacker', () => {
        // King at (0,0) in check from rook at (0,4). White rook at (2,0) can move to (0,2).
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 4), b('rook')],
            [pos(2, 0), w('rook')],
        ]);
        const moves = getLegalMoves(board, pos(2, 0), null);
        expect(moves.some(m => m.q === 0 && m.r === 2)).toBe(true);
    });

    it('a piece can resolve check by capturing the attacker', () => {
        // King at (0,0) in check from black rook at (0,3).
        // White rook at (3,0) can slide via [-1,+1] to reach (0,3).
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 3), b('rook')],
            [pos(3, 0), w('rook')],
        ]);
        const moves = getLegalMoves(board, pos(3, 0), null);
        expect(moves.some(m => m.q === 0 && m.r === 3)).toBe(true);
    });

    it('in double check, only the king can move (sliding pieces cannot help)', () => {
        // Two attackers: rook at (0,3) and knight at (3,-1)
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 3), b('rook')],
            [pos(3, -1), b('knight')],
            [pos(2, 0), w('rook')],
        ]);
        const rookMoves = getLegalMoves(board, pos(2, 0), null);
        expect(rookMoves).toHaveLength(0);
    });

    it('king can move to an unattacked square to escape check', () => {
        // Rook at (0,3) only attacks q=0 column
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 3), b('rook')],
        ]);
        const moves = getLegalMoves(board, pos(0, 0), null);
        expect(moves.length).toBeGreaterThan(0);
        for (const m of moves) expect(m.q).not.toBe(0);
    });

    it('king cannot capture a defended enemy piece', () => {
        // Black rook at (0,1), defended by rook at (0,4) along same file
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 1), b('rook')],
            [pos(0, 4), b('rook')],
        ]);
        const moves = getLegalMoves(board, pos(0, 0), null);
        expect(moves.every(m => !(m.q === 0 && m.r === 1))).toBe(true);
    });

    it('a non-pinned piece retains its full pseudo-legal move set', () => {
        // Rook on (3,0) with king at (0,-3) — not on same axis
        const board = makeBoard([
            [pos(0, -3), w('king')],
            [pos(3, 0), w('rook')],
        ]);
        const legal = getLegalMoves(board, pos(3, 0), null);
        expect(legal.length).toBeGreaterThan(0);
    });

    it('en passant capture is legal when it does not expose the king', () => {
        // White pawn at (0,2), black pawn double-moved to (1,1), epTarget=(1,2)
        // King at (-2,0), far from ep action
        const epTarget = pos(1, 2);
        const board = makeBoard([
            [pos(-2, 0), w('king')],
            [pos(0, 2), w('pawn')],
            [pos(1, 1), b('pawn')],
        ]);
        const moves = getLegalMoves(board, pos(0, 2), epTarget);
        expect(moves.some(m => m.q === 1 && m.r === 2)).toBe(true);
    });

    it('en passant capture is illegal when removing the captured pawn exposes the king', () => {
        // King at (4,0), white pawn at (2,0), black pawn at (1,0) (double-moved from (1,2)).
        // epTarget = (1,1) — white pawn at (2,0) uses capture dir [-1,+1] → (1,1).
        // After ep: pawn leaves (2,0), (1,0) removed, black rook at (-3,0) checks king.
        const epTarget = pos(1, 1);
        const board = makeBoard([
            [pos(4, 0), w('king')],
            [pos(2, 0), w('pawn')],
            [pos(1, 0), b('pawn')],
            [pos(-3, 0), b('rook')],
        ]);
        const moves = getLegalMoves(board, pos(2, 0), epTarget);
        expect(moves.every(m => !(m.q === 1 && m.r === 1))).toBe(true);
    });
});

describe('getGameStatus', () => {
    it("returns 'playing' when king is safe and has legal moves", () => {
        // Rook at (2,3): q+r=5, not on any axis through (0,0)
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(2, 3), b('rook')],
            [pos(3, 2), b('king')],
        ]);
        expect(getGameStatus(board, 'white', null)).toBe('playing');
    });

    it("returns 'check' when king is in check but has escape moves", () => {
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 3), b('rook')],
        ]);
        expect(getGameStatus(board, 'white', null)).toBe('check');
    });

    it("returns 'checkmate' when king is in check with no legal moves", () => {
        // King at (-5,5) corner. Escape squares: (-5,4),(-4,5),(-4,4),(-4,3),(-3,4)
        // Rook at (-4,5): checks via [-1,0], defended by rook at (-4,4) [0,+1].
        // Rook at (-4,4): double-checks via [-1,+1], blocks (-5,4) via [-1,0], defended by (-4,2).
        // Rook at (-4,2): defends (-4,4) and (-4,5) via [0,+1] column.
        // Queen at (-2,3): attacks (-4,3) via [-1,0] and (-3,4) via [-1,+1].
        const board = makeBoard([
            [pos(-5, 5), w('king')],
            [pos(-4, 5), b('rook')],  // checks via [-1,0]
            [pos(-4, 4), b('rook')],  // double-checks via [-1,+1], attacks (-5,4)
            [pos(-4, 2), b('rook')],  // defends (-4,4) and (-4,5)
            [pos(-2, 3), b('queen')], // attacks (-4,3) and (-3,4)
            [pos(3, 2), b('king')],
        ]);
        expect(getGameStatus(board, 'white', null)).toBe('checkmate');
    });

    it("returns 'stalemate' when not in check but no legal moves", () => {
        // King at (-5,5), white pawn at (-4,4) blocks queen diagonal.
        // Black queen at (-3,3): attacks (-5,4) via [-2,+1], (-4,3) via [-1,0], (-3,4) via [0,+1].
        //   Path to king along [-1,+1] is blocked by pawn at (-4,4).
        // Black knight at (-1,4): attacks (-4,5) via [-3,+1] jump.
        // Pawn's only forward move (-4,5) is legal-move-filtered illegal (exposes king to queen).
        const board = makeBoard([
            [pos(-5, 5), w('king')],
            [pos(-4, 4), w('pawn')],
            [pos(-3, 3), b('queen')],
            [pos(-1, 4), b('knight')],
            [pos(3, 2), b('king')],
        ]);
        expect(isInCheck(board, 'white')).toBe(false);
        expect(getGameStatus(board, 'white', null)).toBe('stalemate');
    });

    it("'checkmate' is not confused with 'stalemate' (in check = checkmate)", () => {
        const board = makeBoard([
            [pos(-5, 5), w('king')],
            [pos(-4, 5), b('rook')],
            [pos(-4, 4), b('rook')],
            [pos(-4, 2), b('rook')],
            [pos(-2, 3), b('queen')],
            [pos(3, 2), b('king')],
        ]);
        const status = getGameStatus(board, 'white', null);
        expect(status).toBe('checkmate');
        expect(status).not.toBe('stalemate');
    });

    it("returns 'playing' for the starting board position (white to move)", () => {
        const board = generateBoard();
        expect(getGameStatus(board, 'white', null)).toBe('playing');
    });

    it("returns 'check' when king is attacked and has multiple escape options", () => {
        // King at (0,0) in check from rook on q=0; rooks don't cover off-axis squares
        const board = makeBoard([
            [pos(0, 0), w('king')],
            [pos(0, 4), b('rook')],
        ]);
        expect(getGameStatus(board, 'white', null)).toBe('check');
    });

    it("returns 'playing' for black at the start of the game", () => {
        const board = generateBoard();
        expect(getGameStatus(board, 'black', null)).toBe('playing');
    });
});

describe('isPromotionSquare', () => {
    it('white pawn at top of center file (q=0, r=5) is a promotion square', () => {
        // min(5, 5-0) = 5
        expect(isPromotionSquare(0, 5, 'white')).toBe(true);
    });

    it('white pawn at top of left edge (q=-5, r=5) is a promotion square', () => {
        // min(5, 5-(-5)) = min(5,10) = 5
        expect(isPromotionSquare(-5, 5, 'white')).toBe(true);
    });

    it('white pawn at top of right edge (q=5, r=0) is a promotion square', () => {
        // min(5, 5-5) = 0
        expect(isPromotionSquare(5, 0, 'white')).toBe(true);
    });

    it('black pawn at bottom of center file (q=0, r=-5) is a promotion square', () => {
        // max(-5, -5-0) = -5
        expect(isPromotionSquare(0, -5, 'black')).toBe(true);
    });

    it('black pawn at bottom of right edge (q=5, r=-5) is a promotion square', () => {
        // max(-5, -5-5) = max(-5,-10) = -5
        expect(isPromotionSquare(5, -5, 'black')).toBe(true);
    });

    it('non-promotion square returns false for white', () => {
        expect(isPromotionSquare(0, 4, 'white')).toBe(false);
        expect(isPromotionSquare(0, 0, 'white')).toBe(false);
    });

    it('non-promotion square returns false for black', () => {
        expect(isPromotionSquare(0, -4, 'black')).toBe(false);
        expect(isPromotionSquare(0, 0, 'black')).toBe(false);
    });
});
