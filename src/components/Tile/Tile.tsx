import type { Cell, CellColor } from '../../game/types.ts';
import { hexPoints } from '../../game/board.ts';
import { PieceSymbol } from './Piece.tsx';
import './Tile.css';

const CELL_FILL: Record<CellColor, string> = {
    light: '#f0d9b5',
    mid: '#b58863',
    dark: '#8b4513',
};

interface HexTileProps {
    cell: Cell;
    x: number;
    y: number;
    size: number;
    isSelected: boolean;
    isHighlight: boolean;
    onClick: () => void;
}

export function HexTile({ cell, x, y, size, isSelected, isHighlight, onClick }: HexTileProps) {
    return (
        <g className="hex-tile" onClick={onClick}>
            <polygon
                points={hexPoints(x, y, size * 0.96)}
                fill={CELL_FILL[cell.cellColor]}
                stroke="#111"
                strokeWidth={2}
            />
            {(isSelected || isHighlight) && (
                <polygon
                    points={hexPoints(x, y, size * 0.96)}
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
