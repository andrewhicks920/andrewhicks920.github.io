import { useState } from 'react';
import type { Color } from '../../game/types';
import type { Difficulty } from '../../game/ai';
import './BotSetup.css';

interface BotSetupProps {
    onStart: (playerColor: Color, difficulty: Difficulty) => void;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
    { value: 'easy',   label: 'Easy',   desc: 'Random moves — great for beginners' },
    { value: 'medium', label: 'Medium', desc: 'Thinks 2 moves ahead' },
    { value: 'hard',   label: 'Hard',   desc: 'Thinks 3 moves ahead' },
];

export function BotSetup({ onStart }: BotSetupProps) {
    const [colorChoice, setColorChoice] = useState<Color | 'random'>('white');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');

    function handlePlay() {
        let color: Color;

        if (colorChoice === 'random') color = Math.random() < 0.5 ? 'white' : 'black';

        else color = colorChoice;
        onStart(color, difficulty);
    }

    return (
        <div className="bot-setup-overlay">
            <div className="bot-setup-modal">
                <h2 className="bot-setup-title">vs Computer</h2>

                <section className="bot-setup-section">
                    <h3 className="bot-setup-label">Play as</h3>
                    <div className="bot-setup-color-row">
                        {(['white', 'random', 'black'] as const).map(c => (
                            <button
                                key={c}
                                className={`bot-setup-color-btn${colorChoice === c ? ' active' : ''}`}
                                onClick={() => setColorChoice(c)}
                            >
                                <span className="bot-setup-color-icon">
                                    {c === 'white' && <ColorKing color="white" />}
                                    {c === 'black' && <ColorKing color="black" />}
                                    {c === 'random' && <ColorKing color="random" />}
                                </span>
                                <span className="bot-setup-color-name">
                                    {c === 'white' ? 'White' : c === 'black' ? 'Black' : 'Random'}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="bot-setup-section">
                    <h3 className="bot-setup-label">Difficulty</h3>
                    <div className="bot-setup-difficulty-list">
                        {DIFFICULTY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                className={`bot-setup-diff-btn${difficulty === opt.value ? ' active' : ''}`}
                                onClick={() => setDifficulty(opt.value)}
                            >
                                <span className="bot-setup-diff-label">{opt.label}</span>
                                <span className="bot-setup-diff-desc">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <button className="bot-setup-play-btn" onClick={handlePlay}>
                    Play
                </button>
            </div>
        </div>
    );
}

function ColorKing({ color }: { color: 'white' | 'black' | 'random' }) {
    if (color === 'random') {
        return (
            <svg viewBox="0 0 40 40" width="36" height="36">
                <rect x="0" y="0" width="20" height="40" rx="4" fill="#9f9689" />
                <rect x="20" y="0" width="20" height="40" rx="4" fill="#555353" />
                <text x="20" y="26" textAnchor="middle" fontSize="18" fill="#e8e3de" fontWeight="bold">?</text>
            </svg>
        );
    }
    const bg = color === 'white' ? '#9f9689' : '#555353';
    const fg = color === 'white' ? '#d4ccc4' : '#3a3838';
    return (
        <svg viewBox="0 0 40 40" width="36" height="36">
            <rect width="40" height="40" rx="4" fill={bg} />
            <ellipse cx="20" cy="15" rx="8" ry="9" fill={fg} />
            <ellipse cx="20" cy="38" rx="15" ry="12" fill={fg} />
        </svg>
    );
}
