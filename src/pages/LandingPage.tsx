import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from '../components/Settings/Settings.tsx';
import { TopBar } from '../components/TopBar/TopBar.tsx';
import { type ThemeName } from '../uiConfig.ts';
import '../App.css';
import './LandingPage.css';
import {NAV_ICONS} from "../uiConfig.ts";
import * as React from "react";

interface LandingPageProps {
    themeName: ThemeName;
    pieceSet: string;
    onThemeChange: (t: ThemeName) => void;
    onPieceSetChange: (p: string) => void;
}

function BoardPreview() {
    const [imgError, setImgError] = useState(false);

    if (!imgError) {
        return (
            <img
                src={`${import.meta.env.BASE_URL}hex-demo.gif`}
                alt="Hexagonal chess demo"
                onError={() => setImgError(true)}
            />
        );
    }
}

interface ModeCardProps {
    icon: React.ReactNode;
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
        <div className="landing-shell">
            <TopBar onSettingsOpen={() => setSettingsOpen(true)} />

            <main className="landing-main">
                {/* Board GIF / placeholder */}
                <div className="landing-board-preview">
                    <BoardPreview />
                </div>

                {/* Copy + mode selection */}
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
                            icon={<span className="chessglyph">{'\u0077'}</span>}
                            title="Play Local"
                            desc="Two players on the same device"
                            primary
                            onClick={() => navigate('/play/local')}
                        />
                        <ModeCard
                            icon={<span className="chessglyph">{'\u00F6'}</span>}
                            title="vs Computer"
                            desc="Challenge an AI opponent"
                            onClick={() => navigate('/play/bot')}
                        />
                        <ModeCard
                            icon={<span className="chessglyph">{'\u004D'}</span>}
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
