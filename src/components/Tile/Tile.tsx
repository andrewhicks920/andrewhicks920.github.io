import type { Cell, CellColor } from '../../game/types.ts';
import { hexPoints } from '../../game/board.ts';
import { PieceSymbol } from './Piece.tsx';
import './Tile.css';

const CELL_FILL: Record<CellColor, string> = {
    light: '#F0D9B5',
    mid:   '#B58863',
    dark:  '#8B4513',
};

interface HexTileFillProps {
    cell: Cell;
    x: number;
    y: number;
    size: number;
    isSelected: boolean;
    isHighlight: boolean;
    isClickable: boolean;
    onClick: () => void;
}


export function HexTileFill({ cell, x, y, size, isSelected, isHighlight, isClickable, onClick }: HexTileFillProps) {
    const points = hexPoints(x, y, size);

    return (
        <g
            className={`hex-tile ${isClickable ? 'clickable' : 'no-pointer-events'}`}
            onClick={onClick}
        >
            <polygon
                points={points}
                fill={CELL_FILL[cell.cellColor]}
            />

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
                />
            )}
        </g>
    );
}