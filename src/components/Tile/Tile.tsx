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
}


export function HexTileFill({ cell, x, y, size, isSelected, isHighlight, isCheck, isClickable, onClick, pieceSet }: HexTileFillProps) {
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
                    fill="rgba(220, 0, 0, 0.5)"
                    style={{ pointerEvents: 'none' }}
                />
            )}

            {(isSelected || isHighlight) && (
                <polygon
                    points={points}
                    fill={isSelected ? 'rgba(255, 255, 0, 0.45)' : 'rgba(0, 200, 0, 0.45)'}
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
                />
            )}
        </g>
    );
}