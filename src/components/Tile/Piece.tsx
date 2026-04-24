import type { Piece } from '../../game/types.ts';

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


export function PieceSymbol({ piece, cx, cy, size, pieceSet, flipped }: PieceProps) {
    const color = piece.color === 'white' ? 'w' : 'b';
    const pieceType = PIECE_MAP[piece.type];

    const src = new URL(`../../assets/pieces/${pieceSet}/${color}${pieceType}.png`, import.meta.url).href;

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
