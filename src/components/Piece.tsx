import type { Piece } from '../game/types';

// Import each image file (Vite handles this automatically)
import whiteKing from '../assets/pieces/wk.png';
import blackKing from '../assets/pieces/bk.png';

import whiteQueen from '../assets/pieces/wq.png';
import blackQueen from '../assets/pieces/bq.png';

import whiteRook from '../assets/pieces/wr.png';
import blackRook from '../assets/pieces/br.png';

import whiteBishop from '../assets/pieces/wb.png';
import blackBishop from '../assets/pieces/bb.png';

import whiteKnight from '../assets/pieces/wn.png';
import blackKnight from '../assets/pieces/bn.png';

import whitePawn from '../assets/pieces/wp.png';
import blackPawn from '../assets/pieces/bp.png';


const IMAGES: Record<string, Record<string, string>> = {
    white: { king: whiteKing, queen: whiteQueen, rook: whiteRook, bishop: whiteBishop, knight: whiteKnight, pawn: whitePawn},
    black: { king: blackKing, queen: blackQueen, rook: blackRook, bishop: blackBishop, knight: blackKnight, pawn: blackPawn},
};

interface PieceProps {
    piece: Piece;
    cx: number;
    cy: number;
    size: number;
}

export function PieceSymbol({ piece, cx, cy, size }: PieceProps) {
    const src = IMAGES[piece.color][piece.type];

    return (
        <image
            href={src}
            x={cx - size}
            y={cy - size}
            width={size * 2}
            height={size * 2}
            style={{ pointerEvents: 'none' }}
        />
    );
}