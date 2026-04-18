import type { Piece } from '../../game/types.ts';

interface PieceProps {
    piece: Piece;
    cx: number;
    cy: number;
    size: number;
    style: string;
}

// Map piece types to filename abbreviations
const PIECE_MAP: Record<string, string> = {
    king: 'k',
    queen: 'q',
    rook: 'r',
    bishop: 'b',
    knight: 'n',
    pawn: 'p'
};

export function PieceSymbol({ piece, cx, cy, size, style = 'neo'}: PieceProps) {
    // Generate the filename (e.g., 'w' + 'k' = 'wk')
    const colorKey = piece.color === 'white' ? 'w' : 'b';
    const typeKey = PIECE_MAP[piece.type];
    const fileName = `${colorKey}${typeKey}`;

    const src = new URL(`../../assets/pieces/${style}/${fileName}.png`,import.meta.url).href;

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
