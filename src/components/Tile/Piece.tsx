import type { Piece } from '../../game/types.ts';

interface PieceProps {
    piece: Piece;
    cx: number;
    cy: number;
    size: number;
    style?: string;
}

const PIECE_MAP: Record<string, string> = {
    king: 'k', queen: 'q', rook: 'r',
    bishop: 'b', knight: 'n', pawn: 'p'
};


// Generate filename (e.g., 'w' + 'k' = 'wk')
export function PieceSymbol({ piece, cx, cy, size, style = 'neo'}: PieceProps) {
    const color = piece.color === 'white' ? 'w' : 'b';
    const pieceType = PIECE_MAP[piece.type]; // k, q, r,...

    const src = new URL(`../../assets/pieces/${style}/${color}${pieceType}.png`,import.meta.url).href;

    return (
        <image
            href={src}
            x={cx - size}
            y={cy - size}
            width={size * 2}
            height={size * 2}
            style={{pointerEvents: 'none'}}
        />
    );
}
