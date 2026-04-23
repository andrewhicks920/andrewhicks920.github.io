import { themes, type ThemeName } from '../../themes.ts';
import './Settings.css';

const PIECE_SETS = [
    '3d_chesskid', '3d_plastic', '3d_staunton', '3d_wood', '8_bit',
    'alpha', 'bases', 'blindfold', 'book', 'bubblegum', 'cases',
    'classic', 'club', 'condal', 'dash', 'game_room', 'glass',
    'gothic', 'graffiti', 'icy_sea', 'light', 'lolz', 'marble',
    'maya', 'metal', 'modern', 'nature', 'neo', 'neo_wood', 'neon',
    'newspaper', 'ocean', 'sky', 'space', 'tigers', 'tournament',
    'vintage', 'wood',
];

interface Props {
    themeName: ThemeName;
    pieceSet: string;
    onThemeChange: (name: ThemeName) => void;
    onPieceSetChange: (set: string) => void;
    onClose: () => void;
}

export function Settings({ themeName, pieceSet, onThemeChange, onPieceSetChange, onClose }: Props) {
    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={e => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button className="settings-close" onClick={onClose}>✕</button>
                </div>

                <section>
                    <h3>Board Theme</h3>
                    <div className="theme-grid">
                        {(Object.keys(themes) as ThemeName[]).map(name => {
                            const t = themes[name];
                            return (
                                <button
                                    key={name}
                                    className={`theme-swatch ${name === themeName ? 'selected' : ''}`}
                                    onClick={() => onThemeChange(name)}
                                    title={name}
                                >
                                    <span style={{ background: t['--tile-light'] }} />
                                    <span style={{ background: t['--tile-mid'] }} />
                                    <span style={{ background: t['--tile-dark'] }} />
                                    <span className="theme-label">{name}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h3>Piece Set</h3>
                    <div className="piece-grid">
                        {PIECE_SETS.map(set => (
                            <button
                                key={set}
                                className={`piece-swatch ${set === pieceSet ? 'selected' : ''}`}
                                onClick={() => onPieceSetChange(set)}
                                title={set}
                            >
                                <img
                                    src={new URL(`../../assets/pieces/${set}/wq.png`, import.meta.url).href}
                                    alt={set}
                                    width={48}
                                    height={48}
                                />
                                <span>{set.replace(/_/g, ' ')}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}