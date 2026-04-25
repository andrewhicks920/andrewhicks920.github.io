import type { Piece } from '../../game/types.ts';
import { pieceImageSrc } from '../Tile/Piece.tsx';
import './CapturedPieces.css';

interface Props {
    pieces: Piece[];
    pieceSet: string;
}

export function CapturedPieces({ pieces, pieceSet }: Props) {
    if (pieces.length === 0) return null;

    return (
        <div className="captured-pieces">
            {pieces.map((piece, i) => (
                <img
                    key={`${piece.color}-${piece.type}-${i}`}
                    className="captured-piece"
                    src={pieceImageSrc(piece.color, piece.type, pieceSet)}
                    alt={`${piece.color} ${piece.type}`}
                    title={`${piece.color} ${piece.type}`}
                />
            ))}
        </div>
    );
}
