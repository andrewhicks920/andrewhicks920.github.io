import { Link } from 'react-router-dom';
import './TopBar.css';
import {NAV_ICONS} from '../../uiConfig.ts';

interface TopBarProps {
    onSettingsOpen: () => void;
}

export function TopBar({ onSettingsOpen }: TopBarProps) {
    return (
        <header className="top-bar">
            <Link to="/" className="top-bar-logo">
                <img
                    src={`${import.meta.env.BASE_URL}hexchess_logo.svg`}
                    alt="HexChess"
                    className="top-bar-logo-img"
                />
            </Link>
            <button className="top-bar-settings" onClick={onSettingsOpen} aria-label="Settings">
                {<span className="chessglyph">{NAV_ICONS.settings}</span>}
            </button>
        </header>
    );
}
