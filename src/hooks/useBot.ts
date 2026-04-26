import { useState, useEffect, useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Cell, Color, Position } from '../game/types';
import type { Difficulty } from '../game/ai';
import type { PromoPieceType } from './useGame';

const THINK_TIMEOUT_MS = 8_000;

function spawnWorker(ref: MutableRefObject<Worker | null>): Worker {
    ref.current?.terminate();
    const w = new Worker(new URL('../game/botWorker.ts', import.meta.url), { type: 'module' });
    ref.current = w;
    return w;
}

interface UseBotOptions {
    mode: string;
    cells: Cell[];
    currentTurn: Color;
    enPassantTarget: Position | null;
    isGameOver: boolean;
    promotionPending: Position | null;
    executeBotMove: (from: Position, to: Position) => void;
    confirmPromotion: (piece: PromoPieceType) => void;
}

export interface UseBotResult {
    botReady: boolean;
    playerColor: Color;
    botColor: Color;
    flipped: boolean;
    isThinking: boolean;
    startBot: (color: Color, diff: Difficulty) => void;
    resetBot: () => void;
}

export function useBot({
    mode,
    cells,
    currentTurn,
    enPassantTarget,
    isGameOver,
    promotionPending,
    executeBotMove,
    confirmPromotion,
}: UseBotOptions): UseBotResult {
    const [botReady, setBotReady]       = useState(false);
    const [playerColor, setPlayerColor] = useState<Color>('white');
    const [difficulty, setDifficulty]   = useState<Difficulty>('medium');
    const [isThinking, setIsThinking]   = useState(false);
    const [retrySignal, setRetrySignal] = useState(0);

    const botColor: Color = playerColor === 'white' ? 'black' : 'white';
    const flipped = mode === 'bot' && playerColor === 'black';

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        spawnWorker(workerRef);
        return () => { workerRef.current?.terminate(); workerRef.current = null; };
    }, []);

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
            setIsThinking(false);
            const move = e.data;
            if (move) executeBotMove(move.from, move.to);
        };

        worker.addEventListener('message', handler, { once: true });

        const sendTimer = setTimeout(() => {
            if (cancelled) return;
            setIsThinking(true);
            worker.postMessage({ cells, botColor, enPassantTarget, difficulty });
        }, 350);

        // If the worker takes too long, terminate it, spin up a fresh one, and retry.
        const timeoutTimer = setTimeout(() => {
            if (cancelled) return;
            cancelled = true;
            setIsThinking(false);
            worker.removeEventListener('message', handler);
            spawnWorker(workerRef);
            setRetrySignal(s => s + 1);
        }, 350 + THINK_TIMEOUT_MS);

        return () => {
            cancelled = true;
            clearTimeout(sendTimer);
            clearTimeout(timeoutTimer);
            worker.removeEventListener('message', handler);
            setIsThinking(false);
        };
    }, [mode, botReady, currentTurn, botColor, isGameOver, promotionPending,
        cells, enPassantTarget, difficulty, executeBotMove, retrySignal]);

    // Auto-promote to queen for the bot.
    useEffect(() => {
        if (mode !== 'bot' || !botReady) return;
        if (!promotionPending) return;
        if (currentTurn !== botColor) return;
        confirmPromotion('queen');
    }, [mode, botReady, promotionPending, currentTurn, botColor, confirmPromotion]);

    const startBot = useCallback((color: Color, diff: Difficulty) => {
        setPlayerColor(color);
        setDifficulty(diff);
        setBotReady(true);
    }, []);

    const resetBot = useCallback(() => {
        setBotReady(false);
        setIsThinking(false);
    }, []);

    return { botReady, playerColor, botColor, flipped, isThinking, startBot, resetBot };
}
