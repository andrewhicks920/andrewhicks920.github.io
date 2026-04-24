import { useState } from 'react';
import { Board } from '../components/Board/Board.tsx';
import { Settings } from '../components/Settings/Settings.tsx';
import { MoveHistory } from '../components/MoveHistory/MoveHistory.tsx';
import { CapturedPieces } from '../components/CapturedPieces/CapturedPieces.tsx';
import { TopBar } from '../components/TopBar/TopBar.tsx';
import { useGame } from '../hooks/useGame.ts';
import { themes, type ThemeName } from '../uiConfig.ts';
import '../App.css';
import './LandingPage.css';
import '../index.css';

function PlayerAvatar({ color }: { color: 'white' | 'black' }) {
    const bg = color === 'white' ? '#9f9689' : '#555353';
    const fg = color === 'white' ? '#d4ccc4' : '#3a3838';

    return (
        <svg className="player-avatar" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="4" fill={bg} />
            <ellipse cx="20" cy="15" rx="8" ry="9" fill={fg} />
            <ellipse cx="20" cy="38" rx="15" ry="12" fill={fg} />
        </svg>
    );
}

type GameMode = 'local' | 'analysis' | 'bot' | 'online';

interface GamePageProps {
    mode: GameMode;
    themeName: ThemeName;
    pieceSet: string;
    onThemeChange: (t: ThemeName) => void;
    onPieceSetChange: (p: string) => void;
}

export function GamePage({ mode, themeName, pieceSet, onThemeChange, onPieceSetChange }: GamePageProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);

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
        moveHistory,
    } = useGame();

    const themeVars = themes[themeName] as Record<string, string>;
    const isGameOver = gameStatus === 'checkmate' || gameStatus === 'stalemate';

    let statusMessage = '';
    let statusVariant = '';

    if (gameStatus === 'checkmate') {
        const winner = currentTurn === 'white' ? 'Black' : 'White';
        statusMessage = `Checkmate — ${winner} wins!`;
        statusVariant = 'gameover';
    }
    else if (gameStatus === 'stalemate') {
        statusMessage = `Stalemate — ${currentTurn === 'white' ? 'Black' : 'White'} gets ¾ point`;
        statusVariant = 'gameover';
    }
    else if (gameStatus === 'check') {
        statusMessage = `${currentTurn === 'white' ? 'White' : 'Black'} is in Check!`;
        statusVariant = 'check';
    }

    const modeLabel = mode === 'analysis' ? 'Analysis' : mode === 'bot' ? 'vs Computer' : mode === 'online' ? 'Online' : 'Local';

    return (
        <div className="app-shell" style={themeVars}>
            <TopBar onSettingsOpen={() => setSettingsOpen(true)} />
            <div className="game-content">
            <main className="board-area">
                <div className={`player-panel${currentTurn === 'black' && !isGameOver ? ' player-panel--active' : ''}`}>
                    <PlayerAvatar color="black" />
                    <div className="player-info">
                        <span className="player-name">Black</span>
                        <CapturedPieces pieces={capturedByBlack} />
                    </div>
                    {currentTurn === 'black' && !isGameOver && <div className="turn-dot" />}
                </div>

                <Board
                    cells={cells}
                    currentTurn={currentTurn}
                    selectedPos={selectedPos}
                    validMoves={validMoves}
                    handleCellClick={handleCellClick}
                    gameStatus={gameStatus}
                    promotionPending={promotionPending}
                    confirmPromotion={confirmPromotion}
                    pieceSet={pieceSet}
                />

                <div className={`player-panel${currentTurn === 'white' && !isGameOver ? ' player-panel--active' : ''}`}>
                    <PlayerAvatar color="white" />
                    <div className="player-info">
                        <span className="player-name">White</span>
                        <CapturedPieces pieces={capturedByWhite} />
                    </div>
                    {currentTurn === 'white' && !isGameOver && <div className="turn-dot" />}
                </div>
            </main>

            <aside className="right-panel">
                <div className="right-panel-tabs">
                    <button className="panel-tab panel-tab--active">{modeLabel}</button>
                    <button className="panel-tab panel-tab--active" style={{ marginLeft: 'auto', borderBottomColor: 'transparent', color: '#9a9998' }}>Moves</button>
                </div>
                <MoveHistory moves={moveHistory} />
                <div className="panel-controls">
                    {statusMessage && (
                        <div className={`status-message status-message--${statusVariant}`}>
                            {statusMessage}
                        </div>
                    )}
                    <button className="new-game-btn" onClick={resetGame}>
                        + New Game
                    </button>
                </div>
            </aside>
            </div>

            {settingsOpen && (
                <Settings
                    themeName={themeName}
                    pieceSet={pieceSet}
                    onThemeChange={onThemeChange}
                    onPieceSetChange={onPieceSetChange}
                    onClose={() => setSettingsOpen(false)}
                />
            )}
        </div>
    );
}
