import type { Color, PieceType, Piece } from '../../game/types.ts';

interface PieceProps {
    piece: Piece;
    cx: number;
    cy: number;
    size: number;
    pieceSet: string;
    flipped?: boolean;
}

const PIECE_MAP: Record<string, string> = {
    king: 'k', queen: 'q', rook: 'r',
    bishop: 'b', knight: 'n', pawn: 'p'
};

export function pieceImageSrc(color: Color, type: PieceType, pieceSet: string): string {
    const c = color === 'white' ? 'w' : 'b';
    return new URL(`../../assets/pieces/${pieceSet}/${c}${PIECE_MAP[type]}.png`, import.meta.url).href;
}

export function PieceSymbol({ piece, cx, cy, size, pieceSet, flipped }: PieceProps) {
    const src = pieceImageSrc(piece.color, piece.type, pieceSet);

    return (
        <image
            href={src}
            x={cx - size}
            y={cy - size}
            width={size * 2}
            height={size * 2}
            style={{pointerEvents: 'none'}}
            transform={flipped ? `rotate(180, ${cx}, ${cy})` : undefined}
        />
    );
}
