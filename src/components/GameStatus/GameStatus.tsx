import type { Color } from '../../game/types.ts';
import './GameStatus.css';

interface Props {
    gameStatus: 'playing' | 'check' | 'checkmate' | 'stalemate';
    currentTurn: Color;
    onNewGame: () => void;
    onSettings: () => void;
}


export function GameStatus({ gameStatus, currentTurn, onNewGame, onSettings }: Props) {
    const turnLabel = currentTurn === 'white' ? 'White' : 'Black';

    let message: string;
    let variant: 'turn' | 'check' | 'gameover';

    if (gameStatus === 'checkmate') {
        const winner = currentTurn === 'white' ? 'Black' : 'White';
        message = `Checkmate — ${winner} wins!`;
        variant = 'gameover';
    }
    else if (gameStatus === 'stalemate') {
        const deliverer = currentTurn === 'white' ? 'Black' : 'White';
        message = `Stalemate — ${deliverer} gets ¾ point (Glinski's rules).`;
        variant = 'gameover';
    }
    else if (gameStatus === 'check') {
        message = `${turnLabel}'s turn — Check!`;
        variant = 'check';
    }
    else {
        message = `${turnLabel}'s turn`;
        variant = 'turn';
    }

    return (
        <div className={`game-status game-status--${variant}`}>
            <span className="game-status__message">{message}</span>
            <button className="game-status__new-game" onClick={onNewGame}>
                New Game
            </button>

            <button className="settings-button" onClick={onSettings}>
                ⚙️
            </button>
        </div>
    );
}
