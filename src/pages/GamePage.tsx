import { useState, useCallback } from 'react';
import { Board } from '../components/Board/Board.tsx';
import { Settings } from '../components/Settings/Settings.tsx';
import { MoveHistory } from '../components/MoveHistory/MoveHistory.tsx';
import { CapturedPieces } from '../components/CapturedPieces/CapturedPieces.tsx';
import { TopBar } from '../components/TopBar/TopBar.tsx';
import { BotSetup } from '../components/BotSetup/BotSetup.tsx';
import { EvalBar } from '../components/EvalBar/EvalBar.tsx';
import { AnalysisPanel } from '../components/AnalysisPanel/AnalysisPanel.tsx';
import { useGame } from '../hooks/useGame.ts';
import { useBot } from '../hooks/useBot.ts';
import { useAnalysis } from '../hooks/useAnalysis.ts';
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
        clearSelection,
        moveHistory,
        enPassantTarget,
        undoMove,
        canUndo,
        loadPosition,
        loadPgn,
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

    const { result: analysisResult, loading: analysisLoading } = useAnalysis(
        mode === 'analysis',
        cells,
        currentTurn,
        enPassantTarget,
    );

    // Prevent player from clicking during the bot's turn.
    const wrappedHandleCellClick = useCallback((q: number, r: number) => {
        if (mode === 'bot' && botReady && currentTurn !== playerColor) return;
        handleCellClick(q, r);
    }, [mode, botReady, currentTurn, playerColor, handleCellClick]);

    const handleBotStart = useCallback((color: Color, diff: Difficulty) => {
        resetGame();
        startBot(color, diff);
    }, [resetGame, startBot]);

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
                        clearSelection={clearSelection}
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

                {mode === 'analysis' && (
                    <EvalBar
                        score={analysisResult?.score ?? 0}
                        loading={analysisLoading}
                    />
                )}

                <aside className="right-panel">
                    {mode === 'analysis' ? (
                        <AnalysisPanel
                            topMoves={analysisResult?.topMoves ?? []}
                            loading={analysisLoading}
                            moveHistory={moveHistory}
                            canUndo={canUndo}
                            onUndo={undoMove}
                            onLoadJan={loadPosition}
                            onLoadPgn={loadPgn}
                            onNewGame={resetGame}
                        />
                    ) : (
                        <>
                            <div className="right-panel-tabs">
                                <span className="panel-tab panel-tab--active">
                                    {mode === 'bot' ? 'vs Computer' : mode === 'online' ? 'Online' : 'Local'}
                                </span>
                                <span className="panel-tab panel-tab--secondary">Moves</span>
                            </div>
                            <MoveHistory moves={moveHistory} />
                            <div className="panel-controls">
                                {statusMessage && (
                                    <div
                                        role="status"
                                        aria-live={statusVariant === 'gameover' || statusVariant === 'check' ? 'assertive' : 'polite'}
                                        aria-atomic="true"
                                        className={`status-message status-message--${statusVariant}`}
                                    >
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
                        </>
                    )}
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
