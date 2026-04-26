import { useState, useCallback } from 'react';
import { Board } from '../components/Board/Board.tsx';
import { Settings } from '../components/Settings/Settings.tsx';
import { MoveHistory } from '../components/MoveHistory/MoveHistory.tsx';
import { CapturedPieces } from '../components/CapturedPieces/CapturedPieces.tsx';
import { TopBar } from '../components/TopBar/TopBar.tsx';
import { BotSetup } from '../components/BotSetup/BotSetup.tsx';
import { useGame } from '../hooks/useGame.ts';
import { useBot } from '../hooks/useBot.ts';
import type { Difficulty } from '../game/ai.ts';
import { themes, type ThemeName } from '../uiConfig.ts';
import type { Color } from '../game/types.ts';
import { PlayerAvatar } from '../components/PlayerAvatar/PlayerAvatar.tsx';

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
        executeBotMove,
        gameStatus,
        capturedByWhite,
        capturedByBlack,
        promotionPending,
        confirmPromotion,
        resetGame,
        moveHistory,
        enPassantTarget,
    } = useGame();

    const themeVars = themes[themeName] as Record<string, string>;
    const isGameOver = gameStatus === 'checkmate' || gameStatus === 'stalemate';

    const { botReady, playerColor, botColor, flipped, isThinking, startBot, resetBot } = useBot({
        mode,
        cells,
        currentTurn,
        enPassantTarget,
        isGameOver,
        promotionPending,
        executeBotMove,
        confirmPromotion,
    });

    // Prevent player from clicking during the bot's turn.
    const wrappedHandleCellClick = useCallback((q: number, r: number) => {
        if (mode === 'bot' && botReady && currentTurn !== playerColor) return;
        handleCellClick(q, r);
    }, [mode, botReady, currentTurn, playerColor, handleCellClick]);

    function handleBotStart(color: Color, diff: Difficulty) {
        resetGame();
        startBot(color, diff);
    }

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
    else if (mode === 'bot' && isThinking) {
        statusMessage = 'Computer is thinking…';
        statusVariant = 'thinking';
    }

    const modeLabel = mode === 'analysis' ? 'Analysis' : mode === 'bot' ? 'vs Computer' : mode === 'online' ? 'Online' : 'Local';

    // In bot mode, top panel = opponent (bot), bottom panel = player
    const topColor: Color = mode === 'bot' ? botColor : 'black';
    const bottomColor: Color = mode === 'bot' ? playerColor : 'white';
    const topLabel = mode === 'bot' ? 'Computer' : 'Black';
    const bottomLabel = mode === 'bot' ? 'You' : 'White';

    return (
        <div className="app-shell" style={themeVars}>
            <TopBar onSettingsOpen={() => setSettingsOpen(true)} />
            <div className="game-content">
            <main className="board-area">
                <div className={`player-panel${currentTurn === topColor && !isGameOver ? ' player-panel--active' : ''}`}>
                    <PlayerAvatar color={topColor} className="player-avatar" />
                    <div className="player-info">
                        <span className="player-name">{topLabel}</span>
                        <CapturedPieces pieces={topColor === 'black' ? capturedByBlack : capturedByWhite} pieceSet={pieceSet} />
                    </div>
                    {currentTurn === topColor && !isGameOver && <div className="turn-dot" />}
                </div>

                <Board
                    cells={cells}
                    currentTurn={currentTurn}
                    selectedPos={selectedPos}
                    validMoves={validMoves}
                    handleCellClick={wrappedHandleCellClick}
                    gameStatus={gameStatus}
                    promotionPending={promotionPending}
                    confirmPromotion={confirmPromotion}
                    pieceSet={pieceSet}
                    flipped={flipped}
                />

                <div className={`player-panel${currentTurn === bottomColor && !isGameOver ? ' player-panel--active' : ''}`}>
                    <PlayerAvatar color={bottomColor} className="player-avatar" />
                    <div className="player-info">
                        <span className="player-name">{bottomLabel}</span>
                        <CapturedPieces pieces={bottomColor === 'white' ? capturedByWhite : capturedByBlack} pieceSet={pieceSet} />
                    </div>
                    {currentTurn === bottomColor && !isGameOver && <div className="turn-dot" />}
                </div>
            </main>

            <aside className="right-panel">
                <div className="right-panel-tabs">
                    <span className="panel-tab panel-tab--active">{modeLabel}</span>
                    <span className="panel-tab panel-tab--active" style={{ marginLeft: 'auto', borderBottomColor: 'transparent', color: '#9a9998' }}>Moves</span>
                </div>
                <MoveHistory moves={moveHistory} />
                <div className="panel-controls">
                    {statusMessage && (
                        <div className={`status-message status-message--${statusVariant}`}>
                            {statusMessage}
                        </div>
                    )}
                    <button className="new-game-btn" onClick={() => {
                        resetGame();
                        if (mode === 'bot') resetBot();
                    }}>
                        + New Game
                    </button>
                </div>
            </aside>
            </div>

            {mode === 'bot' && !botReady && (
                <BotSetup onStart={handleBotStart} />
            )}

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
