import { toPixel, fileLabel, isValidCell } from '../../game/board.ts';
import { useGame } from '../../hooks/useGame.ts';
import { HexTileFill } from '../Tile/Tile.tsx';
import './Board.css';

const CELL_SIZE = 40;
const VIEW_W = 17 * CELL_SIZE;
const VIEW_H = 11 * Math.sqrt(3) * CELL_SIZE;
const HEX_H = (CELL_SIZE * Math.sqrt(3)) / 2;
const LABEL_PAD = 50;

// Pre-compute all hex edges as a single SVG path drawn once on top of all fills.
// One path element = one consistent antialiasing pass = no per-tile seam artifacts.
function buildGridPath(size: number): string {
    const h = (size * Math.sqrt(3)) / 2;
    const segments: string[] = [];

    for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {
            if (!isValidCell(q, r))
                continue;

            const { x, y } = toPixel(q, r, size);

            const verts: [number, number][] = [
                [x + size,       y    ],
                [x + size / 2,   y + h],
                [x - size / 2,   y + h],
                [x - size,       y    ],
                [x - size / 2,   y - h],
                [x + size / 2,   y - h],
            ];

            for (let i = 0; i < 6; i++) {
                const [x1, y1] = verts[i];
                const [x2, y2] = verts[(i + 1) % 6];
                segments.push(`M${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}`);
            }
        }
    }
    return segments.join('');
}

const GRID_PATH = buildGridPath(CELL_SIZE);

const FILE_LABELS = Array.from({length: 11}, (_, i) => {
    const q = i - 5;
    const rMin = Math.max(-5, -5 - q);
    const {x, y} = toPixel(q, rMin, CELL_SIZE);
    return {label: fileLabel(q), x, y: y + HEX_H + 25};
});

const RANK_LABELS = Array.from({length: 11}, (_, i) => {
    const rank = i + 1;
    const sum = rank - 6;
    const q = Math.max(-5, sum - 5);
    const r = sum - q;
    const {x, y} = toPixel(q, r, CELL_SIZE);

    /*
    If you look at Wikipedia's article on Hexagonal Chess, it might be a little hard to visualize Ranks 1-11.
    By styling the ranks this way, we have them attached on a tile's corner.

    From White's perspective, a Rank will basically make a V shape for their own AND black pieces
     */
    if (rank >= 6)
        return {label: rank, x: x - CELL_SIZE / 2 - 12, y: y - HEX_H};
    else
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
                    const {x, y} = toPixel(cell.q, cell.r, CELL_SIZE);
                    const isSelected = selectedPos?.q === cell.q && selectedPos?.r === cell.r;
                    const isHighlight = validMoveSet.has(`${cell.q},${cell.r}`);
                    const isClickable = !!cell.piece || isHighlight;

                    return (
                        <HexTileFill
                            key={`fill-${cell.q},${cell.r}`}
                            cell={cell}
                            x={x}
                            y={y}
                            size={CELL_SIZE}
                            isSelected={isSelected}
                            isHighlight={isHighlight}
                            isClickable={isClickable}
                            onClick={() => handleCellClick(cell.q, cell.r)}
                        />
                    );
                })}


                {/* Single path for all grid lines — one element, no per-tile seams */}
                <path
                    d={GRID_PATH}
                    stroke="#111"
                    strokeWidth={2}
                    fill="none"
                    style={{ pointerEvents: 'none' }}
                />

                {FILE_LABELS.map(({label, x, y}) => (
                    <text
                        key={`file-${label}`}
                        className="file-label"
                        x={x}
                        y={y}>
                        {label}
                    </text>
                ))}

                {RANK_LABELS.map(({label, x, y}) => (
                    <text
                        key={`file-${label}`}
                        className="rank-label"
                        x={x}
                        y={y}>
                        {label}
                    </text>
                ))}
            </svg>
        </div>
    );
}