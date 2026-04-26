import type { Cell } from '../../game/types.ts';
import { hexPoints } from '../../game/board.ts';
import { PieceSymbol } from './Piece.tsx';
import './Tile.css';


interface HexTileFillProps {
    cell: Cell;
    x: number;
    y: number;
    size: number;
    isSelected: boolean;
    isHighlight: boolean;
    isCheck: boolean;
    isClickable: boolean;
    onClick: () => void;
    pieceSet: string;
    flipped?: boolean;
}


export function HexTileFill({ cell, x, y, size, isSelected, isHighlight, isCheck, isClickable, onClick, pieceSet, flipped }: HexTileFillProps) {
    const points = hexPoints(x, y, size);

    return (
        <g
            className={`hex-tile ${isClickable ? 'clickable' : 'no-pointer-events'}`}
            onClick={onClick}
        >
            <polygon
                points={points}
                style={{fill: `var(--tile-${cell.cellColor})`}}
            />

            {isCheck && (
                <polygon
                    points={points}
                    fill="var(--highlight-check)"
                    style={{ pointerEvents: 'none' }}
                />
            )}

            {(isSelected || isHighlight) && (
                <polygon
                    points={points}
                    fill={isSelected ? 'var(--highlight-selected)' : 'var(--highlight-move)'}
                    style={{ pointerEvents: 'none' }}
                />
            )}

            {cell.piece && (
                <PieceSymbol
                    piece={cell.piece}
                    cx={x}
                    cy={y}
                    size={size * 0.6}
                    pieceSet={pieceSet}
                    flipped={flipped}
                />
            )}
        </g>
    );
}