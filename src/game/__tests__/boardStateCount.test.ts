/**
 * Counts the total number of board states evaluated across all test scenarios.
 *
 * Every call to getValidMoves — both direct (move generation) and internal
 * (isInCheck iterates all opponent pieces, getLegalMoves filters each
 * pseudo-legal move by king safety) — increments boardStateCount.
 *
 * All scenarios run in one worker so the counter accumulates correctly.
 */

import { it, expect, afterAll } from 'vitest';
import { getValidMoves, resetBoardStateCount, boardStateCount } from '../pieces';
import { getLegalMoves, isInCheck, getGameStatus } from '../gameLogic';
import { generateBoard } from '../board';
import { pos, w, b, makeBoard, allValidCells } from './helpers';

resetBoardStateCount();

// All piece types from every valid cell (455 direct evaluations)
it('every piece type from every valid cell', () => {
    for (const cell of allValidCells()) {
        for (const type of ['rook', 'bishop', 'queen', 'king', 'knight'] as const) {
            const board = makeBoard([[cell, w(type)]]);
            getValidMoves(board, cell);
        }
    }
});

// Specific piece scenarios
it('rook scenarios', () => {
    getValidMoves(makeBoard([[pos(0,0), w('rook')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(5,0), w('rook')]]), pos(5,0));
    getValidMoves(makeBoard([[pos(0,0), w('rook')],[pos(0,3), w('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('rook')],[pos(0,3), b('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('rook')],[pos(0,1), w('pawn')]]), pos(0,0));
});

it('bishop scenarios', () => {
    getValidMoves(makeBoard([[pos(0,0), w('bishop')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('bishop')],[pos(2,2), w('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('bishop')],[pos(1,1), b('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(5,-5), w('bishop')]]), pos(5,-5));
    getValidMoves(makeBoard([[pos(0,0), w('bishop')],[pos(1,1), w('pawn')],[pos(-1,-1), w('pawn')]]), pos(0,0));
});

it('queen scenarios', () => {
    getValidMoves(makeBoard([[pos(0,0), w('queen')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('queen')],[pos(0,2), w('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('queen')],[pos(3,0), b('rook')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('queen')],[pos(2,-1), b('rook')]]), pos(0,0));
});

it('king scenarios', () => {
    getValidMoves(makeBoard([[pos(0,0), w('king')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(5,0), w('king')]]), pos(5,0));
    getValidMoves(makeBoard([[pos(0,0), w('king')],[pos(0,1), b('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('king')],[pos(0,1), w('rook')]]), pos(0,0));
});

it('knight scenarios', () => {
    getValidMoves(makeBoard([[pos(0,0), w('knight')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(5,0), w('knight')]]), pos(5,0));
    getValidMoves(makeBoard([[pos(0,0), w('knight')],[pos(3,-1), b('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), w('knight')],[pos(1,0), b('rook')],[pos(2,0), b('rook')]]), pos(0,0));
});

it('pawn scenarios', () => {
    getValidMoves(makeBoard([[pos(0,0), w('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,-1), w('pawn')]]), pos(0,-1));
    getValidMoves(makeBoard([[pos(0,0), w('pawn')],[pos(0,1), b('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,-1), w('pawn')],[pos(0,0), b('pawn')]]), pos(0,-1));
    getValidMoves(makeBoard([[pos(0,-1), w('pawn')],[pos(0,1), b('pawn')]]), pos(0,-1));
    getValidMoves(makeBoard([[pos(0,0), w('pawn')],[pos(1,0), b('pawn')],[pos(-1,1), b('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,0), b('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,1), b('pawn')]]), pos(0,1));
    getValidMoves(makeBoard([[pos(0,0), b('pawn')],[pos(-1,0), w('pawn')],[pos(1,-1), w('pawn')]]), pos(0,0));
    getValidMoves(makeBoard([[pos(0,2), w('pawn')],[pos(1,1), b('pawn')]]), pos(0,2), pos(1,2));
    getValidMoves(makeBoard([[pos(2,0), b('pawn')],[pos(1,-1), w('pawn')]]), pos(2,0), pos(1,0));
    getValidMoves(makeBoard([[pos(0,2), w('pawn')],[pos(1,1), b('pawn')]]), pos(0,2), null);
    getValidMoves(makeBoard([[pos(0,2), w('pawn')]]), pos(0,2));
});

//isInCheck scenarios (each iterates all opponent pieces' moves)
it('isInCheck scenarios', () => {
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(0,4), b('rook')]]), 'white');
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(2,2), b('bishop')]]), 'white');
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(3,0), b('queen')]]), 'white');
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(-1,-1), b('queen')]]), 'white');
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(3,-1), b('knight')]]), 'white');
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(1,0), b('pawn')]]), 'white');
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(0,2), w('rook')],[pos(0,4), b('rook')]]), 'white');
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(2,3), b('rook')]]), 'white');
    isInCheck(makeBoard([[pos(0,0), b('king')],[pos(0,-3), w('rook')]]), 'black');
    isInCheck(makeBoard([[pos(0,0), w('king')],[pos(0,3), b('king')]]), 'white');
});

// getLegalMoves scenarios (each: pseudo-legal × isInCheck per candidate)
it('getLegalMoves scenarios', () => {
    getLegalMoves(makeBoard([[pos(0,0), w('king')],[pos(0,2), w('rook')],[pos(0,4), b('rook')]]), pos(0,2), null);
    getLegalMoves(makeBoard([[pos(0,0), w('king')],[pos(1,1), w('bishop')],[pos(2,2), b('queen')]]), pos(1,1), null);
    getLegalMoves(makeBoard([[pos(0,0), w('king')],[pos(2,1), b('rook')]]), pos(0,0), null);
    getLegalMoves(makeBoard([[pos(0,0), w('king')],[pos(0,4), b('rook')],[pos(2,0), w('rook')]]), pos(2,0), null);
    getLegalMoves(makeBoard([[pos(0,0), w('king')],[pos(0,3), b('rook')],[pos(3,0), w('rook')]]), pos(3,0), null);
    getLegalMoves(makeBoard([[pos(0,0), w('king')],[pos(0,3), b('rook')],[pos(3,-1), b('knight')],[pos(2,0), w('rook')]]), pos(2,0), null);
    getLegalMoves(makeBoard([[pos(0,0), w('king')],[pos(0,3), b('rook')]]), pos(0,0), null);
    getLegalMoves(makeBoard([[pos(0,0), w('king')],[pos(0,1), b('rook')],[pos(0,4), b('rook')]]), pos(0,0), null);
    getLegalMoves(makeBoard([[pos(0,-3), w('king')],[pos(3,0), w('rook')]]), pos(3,0), null);
    getLegalMoves(makeBoard([[pos(-2,0), w('king')],[pos(0,2), w('pawn')],[pos(1,1), b('pawn')]]), pos(0,2), pos(1,2));
    getLegalMoves(makeBoard([[pos(4,0), w('king')],[pos(2,0), w('pawn')],[pos(1,0), b('pawn')],[pos(-3,0), b('rook')]]), pos(2,0), pos(1,1));
});

// getGameStatus scenarios (most expensive: all pieces × all moves × check)
it('getGameStatus scenarios', () => {
    getGameStatus(makeBoard([[pos(0,0), w('king')],[pos(2,3), b('rook')],[pos(3,2), b('king')]]), 'white', null);
    getGameStatus(makeBoard([[pos(0,0), w('king')],[pos(0,3), b('rook')]]), 'white', null);
    getGameStatus(makeBoard([[pos(-5,5), w('king')],[pos(-4,5), b('rook')],[pos(-4,4), b('rook')],[pos(-4,2), b('rook')],[pos(-2,3), b('queen')],[pos(3,2), b('king')]]), 'white', null);
    getGameStatus(makeBoard([[pos(-5,5), w('king')],[pos(-4,4), w('pawn')],[pos(-3,3), b('queen')],[pos(-1,4), b('knight')],[pos(3,2), b('king')]]), 'white', null);
    getGameStatus(generateBoard(), 'white', null);
    getGameStatus(generateBoard(), 'black', null);
    getGameStatus(makeBoard([[pos(0,0), w('king')],[pos(0,4), b('rook')]]), 'white', null);
});

// Full legal-move enumeration for every piece in the starting position
// Each getLegalMoves call: 1 getValidMoves for the piece + N_pseudolegal × 18
// (isInCheck iterates all 18 opponent pieces). 18 white pieces × ~10 pseudolegal
// × 18 black pieces ≈ 3,000+ additional board-state evaluations.

it('getLegalMoves for every white piece in the starting position', () => {
    const board = generateBoard();
    for (const cell of board) {
        if (cell.piece?.color === 'white')
            getLegalMoves(board, pos(cell.q, cell.r), null);
    }
});

it('getLegalMoves for every black piece in the starting position', () => {
    const board = generateBoard();
    for (const cell of board) {
        if (cell.piece?.color === 'black')
            getLegalMoves(board, pos(cell.q, cell.r), null);
    }
});

afterAll(() => {
    console.log(`\n  Board states evaluated: ${boardStateCount}`);
    expect(boardStateCount).toBeGreaterThan(2300);
});
