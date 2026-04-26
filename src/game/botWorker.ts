import { getBotMove, type Difficulty } from './ai';
import type { Cell, Color, Position } from './types';

/** Message payload sent from the main thread to the bot worker. */
interface BotRequest {
    cells: Cell[];
    botColor: Color;
    enPassantTarget: Position | null;
    difficulty: Difficulty;
}

/**
 * Web Worker message handler.
 * Receives a {@link BotRequest}, runs `getBotMove` off the main thread,
 * and posts the resulting move (or `null`) back to the caller.
 */
self.onmessage = (e: MessageEvent<BotRequest>) => {
    const { cells, botColor, enPassantTarget, difficulty } = e.data;
    const move = getBotMove(cells, botColor, enPassantTarget, difficulty);
    self.postMessage(move);
};
