import { memo } from 'react';
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
    isFocused: boolean;
    handleCellClick: (q: number, r: number) => void;
    pieceSet: string;
    flipped?: boolean;
}


export const HexTileFill = memo(function HexTileFill({ cell, x, y, size, isSelected, isHighlight, isCheck, isClickable, isFocused, handleCellClick, pieceSet, flipped }: HexTileFillProps) {
    const points = hexPoints(x, y, size);

    return (
        <g
            className={`hex-tile ${isClickable ? 'clickable' : 'no-pointer-events'}`}
            onClick={() => handleCellClick(cell.q, cell.r)}
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

            {isFocused && (
                <polygon
                    points={points}
                    fill="none"
                    stroke="white"
                    strokeWidth={3}
                    strokeDasharray="5 3"
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
});