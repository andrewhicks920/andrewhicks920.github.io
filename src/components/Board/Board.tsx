import { toPixel, fileLabel } from '../../game/board.ts';
import { useGame } from '../../hooks/useGame.ts';
import { HexTile } from '../Tile/Tile.tsx';
import './Board.css';

const CELL_SIZE = 40;
const VIEW_W = 17 * CELL_SIZE;
const VIEW_H = 11 * Math.sqrt(3) * CELL_SIZE;
const HEX_H = (CELL_SIZE * Math.sqrt(3)) / 2;
const LABEL_PAD = 50;

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

    From White's perspective, a Rank will basically make a ^ shape for their own pieces, and an V shape for Black pieces
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
                    const { x, y } = toPixel(cell.q, cell.r, CELL_SIZE);
                    const isSelected = selectedPos?.q === cell.q && selectedPos?.r === cell.r;
                    const isHighlight = validMoveSet.has(`${cell.q},${cell.r}`);

                    return (
                        <HexTile
                            key={`${cell.q},${cell.r}`}
                            cell={cell}
                            x={x}
                            y={y}
                            size={CELL_SIZE}
                            isSelected={isSelected}
                            isHighlight={isHighlight}
                            onClick={() => handleCellClick(cell.q, cell.r)}
                        />
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
