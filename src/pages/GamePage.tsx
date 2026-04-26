import { useState, useEffect, useCallback, useRef } from 'react';
import { Board } from '../components/Board/Board.tsx';
import { Settings } from '../components/Settings/Settings.tsx';
import { MoveHistory } from '../components/MoveHistory/MoveHistory.tsx';
import { CapturedPieces } from '../components/CapturedPieces/CapturedPieces.tsx';
import { TopBar } from '../components/TopBar/TopBar.tsx';
import { BotSetup } from '../components/BotSetup/BotSetup.tsx';
import { useGame } from '../hooks/useGame.ts';
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

    // Bot-mode setup state
    const [botReady, setBotReady] = useState(false);
    const [playerColor, setPlayerColor] = useState<Color>('white');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');

    const botColor: Color = playerColor === 'white' ? 'black' : 'white';
    const flipped = mode === 'bot' && playerColor === 'black';

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

    // Prevent player from clicking during the bot's turn
    const wrappedHandleCellClick = useCallback((q: number, r: number) => {
        if (mode === 'bot' && botReady && currentTurn !== playerColor) return;
        handleCellClick(q, r);
    }, [mode, botReady, currentTurn, playerColor, handleCellClick]);

    // Bot Web Worker — created once, lives for the lifetime of the page.
    const workerRef = useRef<Worker | null>(null);
    useEffect(() => {
        const worker = new Worker(
            new URL('../game/botWorker.ts', import.meta.url),
            { type: 'module' },
        );
        workerRef.current = worker;
        return () => { worker.terminate(); workerRef.current = null; };
    }, []);

    // Trigger bot move when it's the computer's turn.
    // Runs the minimax search in the worker so the UI thread stays responsive.
    useEffect(() => {
        if (mode !== 'bot' || !botReady) return;
        if (currentTurn !== botColor) return;
        if (isGameOver) return;
        if (promotionPending) return;

        const worker = workerRef.current;
        if (!worker) return;

        let cancelled = false;

        const handler = (e: MessageEvent) => {
            if (cancelled) return;
            const move = e.data;
            if (move) executeBotMove(move.from, move.to);
        };

        // { once: true } so the listener auto-removes after the first response.
        worker.addEventListener('message', handler, { once: true });

        const timer = setTimeout(() => {
            if (!cancelled) {
                worker.postMessage({ cells, botColor, enPassantTarget, difficulty });
            }
        }, 350);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            worker.removeEventListener('message', handler);
        };
    // cells/enPassantTarget/difficulty intentionally omitted — currentTurn change is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, botReady, currentTurn, botColor, isGameOver, promotionPending]);

    // Auto-promote to queen for the bot
    useEffect(() => {
        if (mode !== 'bot' || !botReady) return;
        if (!promotionPending) return;
        if (currentTurn !== botColor) return;
        confirmPromotion('queen');
    }, [mode, botReady, promotionPending, currentTurn, botColor, confirmPromotion]);


    function handleBotStart(color: Color, diff: Difficulty) {
        setPlayerColor(color);
        setDifficulty(diff);
        resetGame();
        setBotReady(true);
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
                        if (mode === 'bot') setBotReady(false);
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
