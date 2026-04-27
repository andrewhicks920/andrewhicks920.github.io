/**
 * Pure notation utilities for Glinski's hexagonal chess.
 *
 * This module is intentionally free of React state — every function here is a
 * plain deterministic transform that can be unit-tested in isolation.
 *
 * Exports:
 *  - PromoPieceType   — union of the four promotion-eligible piece types
 *  - PIECE_LETTERS    — SAN piece letter map
 *  - PROMO_LETTERS    — promotion piece letter map
 *  - fileOf / rankOf  — coordinate → label helpers
 *  - buildNotation    — produces SAN-style move tokens
 *  - addToHistory     — appends a half-move token to a MoveRecord[]
 *  - parseSanToken    — inverse of buildNotation; used for PGN replay
 */

import type { Cell, Color, Piece, PieceType, Position, MoveRecord } from './types';
import { getLegalMoves } from './gameLogic';
import { FILES } from './board';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Piece types a pawn can promote to. */
export type PromoPieceType = 'queen' | 'rook' | 'bishop' | 'knight';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PIECE_LETTERS: Record<PieceType, string> = {
    king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '',
};

export const PROMO_LETTERS: Record<PromoPieceType, string> = {
    queen: 'Q', rook: 'R', bishop: 'B', knight: 'N',
};

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

export function fileOf(pos: Position): string { return FILES[pos.q + 5] ?? '?'; }
export function rankOf(pos: Position): number  { return pos.q + pos.r + 6; }

// ---------------------------------------------------------------------------
// Notation builder
// ---------------------------------------------------------------------------

/**
 * Builds SAN-style notation for a completed half-move.
 *
 * Disambiguation rules (applied when multiple same-type pieces can reach `to`):
 *   1. Use source file if it uniquely identifies the moving piece.
 *   2. Else use source rank.
 *   3. Else use full source coordinate (file + rank).
 *
 * Pawn captures always include the source file (standard SAN).
 *
 * @param piece           - The piece that moved.
 * @param from            - Its origin square.
 * @param to              - Its destination square.
 * @param captured        - `true` if a piece was captured (including en passant).
 * @param status          - Post-move game status, used to append `+` or `#`.
 * @param boardCells      - Board state *before* the move was applied.
 * @param enPassantTarget - En-passant target available on this move, or `null`.
 */
export function buildNotation(
    piece: Piece,
    from: Position,
    to: Position,
    captured: boolean,
    status: string,
    boardCells: Cell[],
    enPassantTarget: Position | null,
): string {
    const toFile   = fileOf(to);
    const toRank   = rankOf(to);
    const fromFile = fileOf(from);
    const fromRank = rankOf(from);
    const capSym   = captured ? 'x' : '';
    const checkSym = status === 'checkmate' ? '#' : status === 'check' ? '+' : '';

    // Pawns: capture includes source file; moves omit piece letter.
    if (piece.type === 'pawn') {
        if (captured) return `${fromFile}x${toFile}${toRank}${checkSym}`;
        return `${toFile}${toRank}${checkSym}`;
    }

    // Find all other same-type/color pieces that can also legally reach `to`.
    const ambiguousOrigins: Position[] = boardCells
        .filter(c =>
            c.piece?.type  === piece.type &&
            c.piece?.color === piece.color &&
            !(c.q === from.q && c.r === from.r),
        )
        .filter(c => getLegalMoves(boardCells, { q: c.q, r: c.r }, enPassantTarget)
            .some(m => m.q === to.q && m.r === to.r),
        )
        .map(c => ({ q: c.q, r: c.r }));

    let disambiguation = '';

    if (ambiguousOrigins.length > 0) {
        const allOrigins: Position[] = [from, ...ambiguousOrigins];

        const sameFileCount = allOrigins.filter(p => p.q === from.q).length;
        if (sameFileCount === 1) {
            disambiguation = fromFile;
        } else {
            const sameRankCount = allOrigins.filter(p => rankOf(p) === fromRank).length;
            if (sameRankCount === 1)
                disambiguation = String(fromRank);
            else
                disambiguation = `${fromFile}${fromRank}`;
        }
    }

    return `${PIECE_LETTERS[piece.type]}${disambiguation}${capSym}${toFile}${toRank}${checkSym}`;
}

// ---------------------------------------------------------------------------
// Move history helper
// ---------------------------------------------------------------------------

/**
 * Returns a new `MoveRecord[]` with `notation` appended for `color`.
 * Pairs white and black half-moves into the same record by move number.
 */
export function addToHistory(prev: MoveRecord[], color: Color, notation: string): MoveRecord[] {
    if (color === 'white') {
        return [...prev, { moveNumber: prev.length + 1, white: notation }];
    }
    if (prev.length === 0) {
        return [{ moveNumber: 1, black: notation }];
    }
    const last = prev[prev.length - 1];
    if (last.white !== undefined && last.black === undefined) {
        return [...prev.slice(0, -1), { ...last, black: notation }];
    }
    return [...prev, { moveNumber: prev.length + 1, black: notation }];
}

// ---------------------------------------------------------------------------
// SAN parser — converts a move token back into from/to positions
// ---------------------------------------------------------------------------

const PIECE_FROM_SAN: Partial<Record<string, PieceType>> = {
    K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight',
};

const PROMO_FROM_LETTER: Partial<Record<string, PromoPieceType>> = {
    Q: 'queen', R: 'rook', B: 'bishop', N: 'knight',
};

/**
 * Converts a single SAN-style move token back into `{ from, to, promotion }`.
 * Used by `loadPgn` to replay a recorded game.
 *
 * @param token           - A single move token, e.g. `"Nxe4+"`, `"e8=Q#"`.
 * @param cells           - Current board state (before this move is applied).
 * @param turn            - Side whose move this is.
 * @param enPassantTarget - En-passant landing square available this turn, or `null`.
 * @returns Parsed move, or `null` if the token could not be resolved unambiguously.
 */
export function parseSanToken(
    token: string,
    cells: Cell[],
    turn: Color,
    enPassantTarget: Position | null,
): { from: Position; to: Position; promotion?: PromoPieceType } | null {
    let tok = token.replace(/[+#]$/, '');

    // Extract promotion suffix "=X"
    let promotion: PromoPieceType | undefined;
    const promoMatch = tok.match(/=([QRBN])$/);
    if (promoMatch) {
        promotion = PROMO_FROM_LETTER[promoMatch[1]];
        tok = tok.slice(0, -2);
    }

    // Strip capture symbol
    const isCapture = tok.includes('x');
    tok = tok.replace('x', '');

    // Determine piece type
    const firstChar = tok[0];
    const isPawn = !(firstChar in PIECE_FROM_SAN);
    const pieceType: PieceType = isPawn ? 'pawn' : (PIECE_FROM_SAN[firstChar] as PieceType);
    if (!isPawn) tok = tok.slice(1);

    // Destination is the trailing file-letter + rank-digits
    const destMatch = tok.match(/([a-l])(\d+)$/);
    if (!destMatch) return null;

    const toFile  = destMatch[1];
    const toRank  = parseInt(destMatch[2]);
    const disambig = tok.slice(0, tok.length - destMatch[0].length);

    const toQ = FILES.indexOf(toFile) - 5;
    if (toQ < -5) return null;
    const toR = toRank - toQ - 6;
    const to: Position = { q: toQ, r: toR };

    // Find all pieces of this type+color that can legally reach `to`
    let candidates = cells.filter(c =>
        c.piece?.type  === pieceType &&
        c.piece?.color === turn &&
        getLegalMoves(cells, { q: c.q, r: c.r }, enPassantTarget)
            .some(m => m.q === to.q && m.r === to.r),
    );

    if (candidates.length === 0) return null;

    // Narrow by disambiguation string (may contain file and/or rank)
    if (disambig) {
        const fileMatch = /^([a-l])/.exec(disambig);
        const rankMatch = /(\d+)$/.exec(disambig);
        if (fileMatch) {
            const dq = FILES.indexOf(fileMatch[1]) - 5;
            candidates = candidates.filter(c => c.q === dq);
        }
        if (rankMatch) {
            const dRank = parseInt(rankMatch[1]);
            candidates = candidates.filter(c => c.q + c.r + 6 === dRank);
        }
    }

    // For pawn captures, source file must be present in the token
    if (isPawn && isCapture && !disambig && candidates.length > 1) return null;

    if (candidates.length !== 1) return null;

    return { from: { q: candidates[0].q, r: candidates[0].r }, to, promotion };
}
