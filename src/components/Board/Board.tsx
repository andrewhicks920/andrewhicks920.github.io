import { toPixel, isValidCell, hexVertices } from '../../game/board.ts';
import { useGame } from '../../hooks/useGame.ts';
import { HexTileFill } from '../Tile/Tile.tsx';
import { GameStatus } from '../GameStatus/GameStatus.tsx';
import { CapturedPieces } from '../CapturedPieces/CapturedPieces.tsx';
import type { Color, PieceType } from '../../game/types.ts';
import './Board.css';

const CELL_SIZE = 40;
const VIEW_W = 17 * CELL_SIZE;
const VIEW_H = 11 * Math.sqrt(3) * CELL_SIZE;
const HEX_H = (CELL_SIZE * Math.sqrt(3)) / 2;
const LABEL_PAD = 50;

const PIECE_MAP: Record<string, string> = {
    queen: 'q', rook: 'r', bishop: 'b', knight: 'n',
};

const PROMOTION_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

/**
 * Pre-computes all hex edges as a single SVG path string, drawn once over all tile fills.
 *
 * @param size - Hex radius, should match the CELL_SIZE used for tile rendering
 * @returns SVG path `d` attribute string of M/L segments tracing every hex edge
 */
function buildGridPath(size: number): string {
    const segments: string[] = [];

    for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {

            if (!isValidCell(q, r))
                continue;

            const {x, y} = toPixel(q, r, size);
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


const FILE_LABELS = Array.from(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l'], (label, i) => {
    const q = i - 5;
    const rMin = Math.max(-5, -5 - q);
    const {x, y} = toPixel(q, rMin, CELL_SIZE);

    return {label, x: x, y: y + HEX_H + 25};
});

const RANK_LABELS = Array.from({length: 11}, (_, i) => {
    const rank = i + 1;
    const sum = rank - 6;
    const q = Math.max(-5, sum - 5);
    const r = sum - q;

    /*
    To help with understanding the idea of ranks in hexagonal chess, the numbers will be positioned a bit differently

    Ranks 6-11 will be positioned at this corner, here -->   ______
                                                            /      \
    Ranks 1-5 will be positioned at this corner, here -->  /        \
                                                           \        /
                                                            \______/

    The idea is that this will help make it easier to visualize the "V-nature" of a rank
     */
    const {x, y} = toPixel(q, r, CELL_SIZE);
    if (rank >= 6) {
        const topRightHexCornerPos = hexVertices(x, y, CELL_SIZE)[4];
        return {label: rank, x: topRightHexCornerPos[0] - 10, y: topRightHexCornerPos[1] - 10};
    }

    else {
        const bottomLeftHexCornerPos = hexVertices(x, y, CELL_SIZE)[3];
        return {label: rank, x: bottomLeftHexCornerPos[0] - 10, y: bottomLeftHexCornerPos[1]};
    }
});

function pieceImageSrc(color: Color, type: PieceType, pieceSet: string): string {
    const c = color === 'white' ? 'w' : 'b';
    return new URL(`../../assets/pieces/${pieceSet}/${c}${PIECE_MAP[type]}.png`, import.meta.url).href;
}

interface BoardProps {
    pieceSet: string;
    onSettingsOpen: () => void;
}

export function Board({ pieceSet, onSettingsOpen }: BoardProps) {
    const {
        cells,
        currentTurn,
        selectedPos,
        validMoves,
        handleCellClick,
        gameStatus,
        capturedByWhite,
        capturedByBlack,
        promotionPending,
        confirmPromotion,
        resetGame,
    } = useGame();

    const validMoveSet = new Set(validMoves.map(p => `${p.q},${p.r}`));

    const kingInCheckKey = (gameStatus === 'check' || gameStatus === 'checkmate')
        ? cells.find(c => c.piece?.type === 'king' && c.piece.color === currentTurn)
        : null;
    const checkKey = kingInCheckKey ? `${kingInCheckKey.q},${kingInCheckKey.r}` : null;

    const isGameOver = gameStatus === 'checkmate' || gameStatus === 'stalemate';

    return (
        <div className="board-wrapper">
            <GameStatus
                gameStatus={gameStatus}
                currentTurn={currentTurn}
                onNewGame={resetGame}
                onSettings={onSettingsOpen}
            />

            <div className="board-row">
                <CapturedPieces pieces={capturedByBlack} label="Black captured" />

                <svg
                    viewBox={`${-VIEW_W / 2 - LABEL_PAD} ${-VIEW_H / 2 - LABEL_PAD} ${VIEW_W + 2 * LABEL_PAD} ${VIEW_H + 2 * LABEL_PAD}`}
                    className="board-svg"
                    width="100%"
                    height="100%"
                >
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
                                pieceSet={pieceSet}
                                onClick={() => handleCellClick(cell.q, cell.r)}
                            />
                        );
                    })}

                    <path
                        d={GRID_PATH}
                        stroke="#111"
                        strokeWidth={2}
                        fill="none"
                        style={{ pointerEvents: 'none' }}
                    />

                    {FILE_LABELS.map(({ label, x, y }) => (
                        <text key={`file-${label}`} className="file-label" x={x} y={y}>
                            {label}
                        </text>
                    ))}

                    {RANK_LABELS.map(({ label, x, y }) => (
                        <text key={`rank-${label}`} className="rank-label" x={x} y={y}>
                            {label}
                        </text>
                    ))}
                </svg>

                <CapturedPieces pieces={capturedByWhite} label="White captured" />
            </div>

            {promotionPending && (
                <div className="promotion-overlay">
                    <div className="promotion-dialog">
                        <p className="promotion-title">
                            Choose a piece to promote to:
                        </p>
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
