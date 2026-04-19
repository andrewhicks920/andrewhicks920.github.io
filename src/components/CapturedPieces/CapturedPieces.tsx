import type { Piece } from '../../game/types.ts';
import './CapturedPieces.css';

const PIECE_UNICODE: Record<string, { white: string; black: string }> = {
    king:   { white: '♔', black: '♚' },
    queen:  { white: '♕', black: '♛' },
    rook:   { white: '♖', black: '♜' },
    bishop: { white: '♗', black: '♝' },
    knight: { white: '♘', black: '♞' },
    pawn:   { white: '♙', black: '♟' },
};

interface Props {
    pieces: Piece[];
    label: string;
}

export function CapturedPieces({ pieces, label }: Props) {
    return (
        <div className="captured-panel">
            <span className="captured-label">{label}</span>
            <div className="captured-pieces">
                {pieces.map((piece, i) => (
                    <span
                        key={i}
                        className={`captured-piece captured-piece--${piece.color}`}
                        title={`${piece.color} ${piece.type}`}
                    >
                        {PIECE_UNICODE[piece.type][piece.color]}
                    </span>
                ))}
                {pieces.length === 0 && (
                    <span className="captured-empty">—</span>
                )}
            </div>
        </div>
    );
}
