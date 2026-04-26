import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from '../components/Settings/Settings.tsx';
import { TopBar } from '../components/TopBar/TopBar.tsx';
import { NAV_ICONS, type ThemeName } from '../uiConfig.ts';
import '../App.css';
import './LandingPage.css';

import boardImg  from '../assets/carouselImages/Glinski_Chess_Board.svg';
import pawnImg   from '../assets/carouselImages/Glinski_Chess_Pawn.svg';
import knightImg from '../assets/carouselImages/Glinski_Chess_Knight.svg';
import bishopImg from '../assets/carouselImages/Glinski_Chess_Bishop.svg';
import rookImg   from '../assets/carouselImages/Glinski_Chess_Rook.svg';
import queenImg  from '../assets/carouselImages/Glinski_Chess_Queen.svg';
import kingImg   from '../assets/carouselImages/Glinski_Chess_King.svg';

const SLIDES = [
    { src: boardImg,  label: 'Starting Position' },
    { src: pawnImg,   label: 'Pawn: \nCaptures (×), \nWhite Promotion Tiles (★)'},
    { src: knightImg, label: 'Knight Moves'},
    { src: bishopImg, label: 'Bishop Moves'},
    { src: rookImg,   label: 'Rook Moves'},
    { src: queenImg,  label: 'Queen Moves'},
    { src: kingImg,   label: 'King Moves'},
] as const;

const SLIDE_INTERVAL = 3500;

function PieceCarousel() {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        const id = setInterval(() => {setIndex(prev => (prev + 1) % SLIDES.length);}, SLIDE_INTERVAL);

        return () => clearInterval(id);
    }, [paused]);

    function go(delta: number) {
        setIndex(prev => (prev + delta + SLIDES.length) % SLIDES.length);
    }

    const { src, label } = SLIDES[index];

    return (
        <div
            className="carousel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <img
                key={index}
                className="carousel-img"
                src={src}
                alt={`${label} movement diagram`}
            />

            <button className="carousel-btn carousel-btn--prev" onClick={() => go(-1)} aria-label="Previous">
                ‹
            </button>
            <button className="carousel-btn carousel-btn--next" onClick={() => go(1)} aria-label="Next">
                ›
            </button>

            <div className="carousel-footer">
                <span className="carousel-label">{label}</span>
                <div className="carousel-dots">
                    {SLIDES.map((slide, i) => (
                        <button
                            key={slide.label}
                            className={`carousel-dot${i === index ? ' carousel-dot--active' : ''}`}
                            onClick={() => setIndex(i)}
                            aria-label={slide.label}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

interface LandingPageProps {
    themeName: ThemeName;
    pieceSet: string;
    onThemeChange: (t: ThemeName) => void;
    onPieceSetChange: (p: string) => void;
}

interface ModeCardProps {
    icon: ReactNode;
    title: string;
    desc: string;
    badge?: string;
    primary?: boolean;
    disabled?: boolean;
    onClick: () => void;
}

function ModeCard({ icon, title, desc, badge, primary, disabled, onClick }: ModeCardProps) {
    const classes = [
        'mode-card',
        primary ? 'mode-card--primary' : '',
        disabled ? 'mode-card--disabled' : '',
    ].filter(Boolean).join(' ');

    return (
        <button className={classes} onClick={disabled ? undefined : onClick} disabled={disabled}>
            <span className="mode-card-icon">{icon}</span>
            <span className="mode-card-text">
                <span className="mode-card-title">{title}</span>
                <span className="mode-card-desc">{desc}</span>
            </span>
            {badge && <span className="mode-card-badge">{badge}</span>}
        </button>
    );
}

export function LandingPage({ themeName, pieceSet, onThemeChange, onPieceSetChange }: LandingPageProps) {
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <div className="app-shell">
            <TopBar onSettingsOpen={() => setSettingsOpen(true)} />

            <main className="landing-main">
                <div className="landing-board-preview">
                    <PieceCarousel />
                </div>

                <section className="landing-hero">
                    <div>
                        <h1 className="landing-headline">
                            Play <em>Hexagonal Chess</em> today!
                        </h1>
                        <p className="landing-sub">
                            Glinski's classic variant on a 91-cell board
                        </p>
                    </div>

                    <div className="landing-modes">
                        <ModeCard
                            icon={<span className="chessglyph">{'w'}</span>}
                            title="Play Local"
                            desc="Two players on the same device"
                            primary
                            onClick={() => navigate('/play/local')}
                        />
                        <ModeCard
                            icon={<span className="chessglyph">{'ö'}</span>}
                            title="vs Computer"
                            desc="Challenge an AI opponent"
                            onClick={() => navigate('/play/bot')}
                        />
                        <ModeCard
                            icon={<span className="chessglyph">{'M'}</span>}
                            title="Play Online"
                            desc="Compete against players worldwide"
                            badge="Coming Soon"
                            disabled
                            onClick={() => navigate('/play/online')}
                        />
                        <ModeCard
                            icon={<span className="chessglyph">{NAV_ICONS.analysis}</span>}
                            title="Analysis"
                            desc="Explore positions with move history"
                            onClick={() => navigate('/analysis')}
                        />
                    </div>
                </section>
            </main>

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
