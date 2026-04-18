import {toPixel, hexPoints, fileLabel} from '../game/board';
import {type CellColor} from '../game/types';
import {PieceSymbol} from './Piece';
import {useGame} from "../hooks/useGame.ts";

const CELL_SIZE = 40;

// Glinski board spans q: -5...5 and r offset: -5.5...5.5 (with half-cell margin)
const VIEW_W = 17 * CELL_SIZE;
const VIEW_H = 11 * Math.sqrt(3) * CELL_SIZE;

const CELL_FILL: Record<CellColor, string> = {
    light: '#f0d9b5',
    mid: '#b58863',
    dark: '#8b4513',
};


const HEX_H = (CELL_SIZE * Math.sqrt(3)) / 2;
const LABEL_PAD = 50;

// File labels (a–l): below the bottom-most hex in each column
const FILE_LABELS = Array.from({length: 11}, (_, i) => {
    const q = i - 5;
    const rMin = Math.max(-5, -5 - q);
    const {x, y} = toPixel(q, rMin, CELL_SIZE);

    return {label: fileLabel(q), x, y: y + HEX_H + 25};
});

// Rank labels (1–11)
const RANK_LABELS = Array.from({length: 11}, (_, i) => {
    const rank = i + 1;
    const sum = rank - 6;

    const q = Math.max(-5, sum - 5);
    const r = sum - q;

    const {x, y} = toPixel(q, r, CELL_SIZE);

    if (rank >= 6) // Top-left corner of the hex
        return {label: rank, x: x - CELL_SIZE / 2 - 12, y: y - HEX_H};

    else // Left-middle vertex of the hex
        return {label: rank, x: x - CELL_SIZE - 12, y};
});


export function Board() {
    const { cells, selectedPos, validMoves, handleCellClick } = useGame();
    const validMoveSet = new Set(validMoves.map(p => `${p.q},${p.r}`));

    return (
        <div className="board-wrapper">
            <svg
                viewBox={`${-VIEW_W / 2 - LABEL_PAD} ${-VIEW_H / 2 - LABEL_PAD} ${VIEW_W + 2 * LABEL_PAD} ${VIEW_H + 2 * LABEL_PAD}`}
                className="board-svg"
                width="100%"
                height="100%"
            >
                {cells.map(cell => {
                    const { x, y } = toPixel(cell.q, cell.r, CELL_SIZE);
                    const isSelected = selectedPos?.q === cell.q && selectedPos?.r === cell.r;
                    const isHighlight = validMoveSet.has(`${cell.q},${cell.r}`);

                    return (
                        <g
                            key={`${cell.q},${cell.r}`}
                            onClick={(e) => { e.stopPropagation(); handleCellClick(cell.q, cell.r); }}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Base tile */}
                            <polygon
                                points={hexPoints(x, y, CELL_SIZE * 0.96)}
                                fill={CELL_FILL[cell.cellColor]}
                                stroke="#111"
                                strokeWidth={2}
                            />

                            {/* Selection / move highlight overlay */}
                            {(isSelected || isHighlight) && (
                                <polygon
                                    points={hexPoints(x, y, CELL_SIZE * 0.96)}
                                    fill={
                                        isSelected
                                            ? 'rgba(255, 255, 0, 0.45)'
                                            : 'rgba(0, 200, 0, 0.45)'
                                    }
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}

                            {/* Piece — inside the <g> so clicks on it bubble to the onClick above */}
                            {cell.piece && (
                                <PieceSymbol
                                    piece={cell.piece}
                                    cx={x}
                                    cy={y}
                                    size={CELL_SIZE * 0.6}
                                />
                            )}
                        </g>
                    );
                })}

                {FILE_LABELS.map(({label, x, y}) => (
                    <text key={`file-${label}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={20} fill="#ccc" fontFamily="sans-serif">
                        {label}
                    </text>
                ))}

                {RANK_LABELS.map(({label, x, y}) => (
                    <text key={`rank-${label}`} x={x} y={y} textAnchor="end" dominantBaseline="middle" fontSize={20} fill="#ccc" fontFamily="sans-serif">
                        {label}
                    </text>
                ))}

            </svg>
        </div>
    );
}