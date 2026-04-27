import { toPixel, isValidCell, hexVertices, FILES } from '../../game/board.ts';
import { HexTileFill } from '../Tile/Tile.tsx';
import { pieceImageSrc } from '../Tile/Piece.tsx';
import type { Cell, Color, Position } from '../../game/types.ts';
import type { PromoPieceType } from '../../hooks/useGame.ts';
import { useMemo, useState } from 'react';
import './Board.css';

const CELL_SIZE = 40;
const VIEW_W = 17 * CELL_SIZE;
const VIEW_H = 11 * Math.sqrt(3) * CELL_SIZE;
const HEX_H = (CELL_SIZE * Math.sqrt(3)) / 2;
const LABEL_PAD = 50;

const PROMOTION_PIECES: PromoPieceType[] = ['queen', 'rook', 'bishop', 'knight'];

function buildGridPath(size: number): string {
    const segments: string[] = [];
    for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {
            if (!isValidCell(q, r)) continue;
            const { x, y } = toPixel(q, r, size);
            const vertices = hexVertices(x, y, size);
            for (let i = 0; i < 6; i++) {
                const [x1, y1] = vertices[i];
                const [x2, y2] = vertices[(i + 1) % 6];
                segments.push(`M${x1},${y1}L${x2},${y2}`);
            }
        }
    }
    return segments.join('');
}

const GRID_PATH = buildGridPath(CELL_SIZE);

function buildFileLabels(flipped: boolean) {
    return Array.from(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l'], (label, i) => {
        const q = i - 5;
        const r = flipped ? Math.min(5, 5 - q) : Math.max(-5, -5 - q);
        const { x, y } = toPixel(q, r, CELL_SIZE);

        if (flipped)
            return { label, x, y: y - HEX_H - 25 };

        else
            return { label, x, y: y + HEX_H + 25 };
    });
}

function buildRankLabels(flipped: boolean) {
    return Array.from({ length: 11 }, (_, i) => {
        const rank = i + 1;
        const sum = rank - 6;

        // Flipped uses the right hexagonal edge; normal uses the left edge.
        const q = flipped ? Math.min(5, sum + 5) : Math.max(-5, sum - 5);
        const r = sum - q;
        const { x, y } = toPixel(q, r, CELL_SIZE);

        if (flipped) { // Use the rightmost cell of the rank — after rotate(180) this appears on the left

            if (rank > 6) {
                const v = hexVertices(x, y, CELL_SIZE)[0]; // middle-left vertex
                return { label: rank, x: v[0] + 10, y: v[1] - 5 };
            }
            else {
                const v = hexVertices(x, y, CELL_SIZE)[1]; // top-left vertex
                return { label: rank, x: v[0] + 10, y: v[1] + 10};
            }
        }

        else {

            if (rank >= 6) {
                const v = hexVertices(x, y, CELL_SIZE)[4]; // top-left vertex
                return { label: rank, x: v[0] - 10, y: v[1] - 10 };
            }
            else {
                const v = hexVertices(x, y, CELL_SIZE)[3]; // left-middle vertex
                return { label: rank, x: v[0] - 10, y: v[1] };
            }
        }
    });
}

// Arrow-key → hex direction mapping. Covers 4 of 6 axial directions; the
// remaining two diagonals (northwest / southeast) are reachable by combining
// adjacent key presses. A flat-top board maps naturally to these four.
const KEY_DIRS: Partial<Record<string, [number, number]>> = {
    ArrowRight: [ 1,  0],   // east
    ArrowLeft:  [-1,  0],   // west
    ArrowUp:    [ 0,  1],   // northeast
    ArrowDown:  [ 0, -1],   // southwest
};

/** Returns a human-readable description of a cell for screen-reader announcements. */
function describeCell(cells: Cell[], q: number, r: number, isSelected: boolean, isHighlight: boolean): string {
    const file  = FILES[q + 5] ?? '?';
    const rank  = q + r + 6;
    const label = `${file}${rank}`;
    const cell  = cells.find(c => c.q === q && c.r === r);

    if (!cell?.piece) {
        return isHighlight ? `${label} — valid move destination` : `${label} — empty`;
    }

    const color = cell.piece.color === 'white' ? 'White' : 'Black';
    const type  = cell.piece.type;
    const suffix = isSelected ? ', selected' : isHighlight ? ', valid move destination' : '';
    return `${label} — ${color} ${type}${suffix}`;
}

interface BoardProps {
    cells: Cell[];
    currentTurn: Color;
    selectedPos: Position | null;
    validMoves: Position[];
    handleCellClick: (q: number, r: number) => void;
    clearSelection: () => void;
    gameStatus: 'playing' | 'check' | 'checkmate' | 'stalemate';
    promotionPending: Position | null;
    confirmPromotion: (pieceType: PromoPieceType) => void;
    pieceSet: string;
    flipped?: boolean;
}

export function Board({
    cells,
    currentTurn,
    selectedPos,
    validMoves,
    handleCellClick,
    clearSelection,
    gameStatus,
    promotionPending,
    confirmPromotion,
    pieceSet,
    flipped = false,
}: BoardProps) {
    const validMoveSet = useMemo(
        () => new Set(validMoves.map(p => `${p.q},${p.r}`)),
        [validMoves],
    );

    const checkKey = useMemo(() => {
        if (gameStatus !== 'check' && gameStatus !== 'checkmate') return null;
        const king = cells.find(c => c.piece?.type === 'king' && c.piece.color === currentTurn);
        return king ? `${king.q},${king.r}` : null;
    }, [cells, currentTurn, gameStatus]);

    const isGameOver = gameStatus === 'checkmate' || gameStatus === 'stalemate';

    const fileLabels = useMemo(() => buildFileLabels(flipped), [flipped]);
    const rankLabels = useMemo(() => buildRankLabels(flipped), [flipped]);

    // -----------------------------------------------------------------------
    // Keyboard navigation — virtual focus cursor on the SVG
    // -----------------------------------------------------------------------

    const [focusedPos, setFocusedPos] = useState<Position | null>(null);
    const [announcement, setAnnouncement] = useState('');

    function handleSvgFocus() {
        // When focus enters, land on the selected piece, or centre of the board.
        if (!focusedPos) {
            const start = selectedPos ?? { q: 0, r: 0 };
            setFocusedPos(start);
            setAnnouncement(describeCell(cells, start.q, start.r, false, false));
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
        if (promotionPending) return;

        const dir = KEY_DIRS[e.key];
        if (dir) {
            e.preventDefault();
            const cur = focusedPos ?? { q: 0, r: 0 };
            const nq  = cur.q + dir[0];
            const nr  = cur.r + dir[1];
            if (isValidCell(nq, nr)) {
                const next       = { q: nq, r: nr };
                const isSelected = selectedPos?.q === nq && selectedPos?.r === nr;
                const isHighlight = validMoveSet.has(`${nq},${nr}`);
                setFocusedPos(next);
                setAnnouncement(describeCell(cells, nq, nr, isSelected, isHighlight));
            }
            return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const pos = focusedPos ?? { q: 0, r: 0 };
            handleCellClick(pos.q, pos.r);
            const isSelected  = selectedPos?.q === pos.q && selectedPos?.r === pos.r;
            const isHighlight = validMoveSet.has(`${pos.q},${pos.r}`);
            setAnnouncement(describeCell(cells, pos.q, pos.r, isSelected, isHighlight));
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            clearSelection();
            setAnnouncement('Selection cleared');
        }
    }

    return (
        <div className="board-wrapper">
            {/* Screen-reader live region — updated on keyboard events */}
            <div className="sr-only" aria-live="assertive" aria-atomic="true">
                {announcement}
            </div>
            <svg
                role="application"
                aria-label={`Hexagonal chess board, ${currentTurn} to move`}
                tabIndex={0}
                onFocus={handleSvgFocus}
                onKeyDown={handleKeyDown}
                viewBox={`${-VIEW_W / 2 - LABEL_PAD} ${-VIEW_H / 2 - LABEL_PAD} ${VIEW_W + 2 * LABEL_PAD} ${VIEW_H + 2 * LABEL_PAD}`}
                className="board-svg"
                width="100%"
                height="100%"
            >
                <g transform={flipped ? 'rotate(180)' : undefined}>
                    {cells.map(cell => {
                        const { x, y } = toPixel(cell.q, cell.r, CELL_SIZE);
                        const key = `${cell.q},${cell.r}`;
                        const isSelected = selectedPos?.q === cell.q && selectedPos?.r === cell.r;
                        const isHighlight = validMoveSet.has(key);
                        const isCheck = key === checkKey;
                        const isClickable =
                            !promotionPending &&
                            !isGameOver &&
                            (!!cell.piece || isHighlight);

                        const isFocused =
                            focusedPos?.q === cell.q && focusedPos?.r === cell.r;

                        return (
                            <HexTileFill
                                key={`fill-${key}`}
                                cell={cell}
                                x={x}
                                y={y}
                                size={CELL_SIZE}
                                isSelected={isSelected}
                                isHighlight={isHighlight}
                                isCheck={isCheck}
                                isClickable={isClickable}
                                isFocused={isFocused}
                                pieceSet={pieceSet}
                                flipped={flipped}
                                handleCellClick={handleCellClick}
                            />
                        );
                    })}

                    <path
                        d={GRID_PATH}
                        stroke="var(--grid-stroke)"
                        strokeWidth={2}
                        fill="none"
                        style={{ pointerEvents: 'none' }}
                    />

                    {fileLabels.map(({ label, x, y }) => (
                        <text
                            key={`file-${label}`}
                            className="file-label"
                            x={x}
                            y={y}
                            transform={flipped ? `rotate(180, ${x}, ${y})` : undefined}
                        >
                            {label}
                        </text>
                    ))}

                    {rankLabels.map(({ label, x, y }) => (
                        <text
                            key={`rank-${label}`}
                            className="rank-label"
                            x={x}
                            y={y}
                            transform={flipped ? `rotate(180, ${x}, ${y})` : undefined}
                        >
                            {label}
                        </text>
                    ))}
                </g>
            </svg>

            {promotionPending && (
                <div className="promotion-overlay">
                    <div className="promotion-dialog">
                        <p className="promotion-title">Choose a piece to promote to:</p>
                        <div className="promotion-choices">
                            {PROMOTION_PIECES.map(type => (
                                <button
                                    key={type}
                                    className="promotion-btn"
                                    onClick={() => confirmPromotion(type)}
                                    title={type}
                                >
                                    <img
                                        src={pieceImageSrc(currentTurn, type, pieceSet)}
                                        alt={type}
                                        width={72}
                                        height={72}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
