import { useState } from 'react';
import { Board } from './components/Board/Board.tsx';
import { Settings } from './components/Settings/Settings.tsx';
import { themes, type ThemeName } from './themes.ts';
import './App.css';

function App() {
    const [themeName, setThemeName] = useState<ThemeName>('classic');
    const [pieceSet, setPieceSet] = useState('neo');
    const [settingsOpen, setSettingsOpen] = useState(false);

    const themeVars = themes[themeName] as Record<string, string>;

    return (
        <div className="app" style={themeVars}>
            <Board
                pieceSet={pieceSet}
                onSettingsOpen={() => setSettingsOpen(true)}
            />
            {settingsOpen && (
                <Settings
                    themeName={themeName}
                    pieceSet={pieceSet}
                    onThemeChange={setThemeName}
                    onPieceSetChange={setPieceSet}
                    onClose={() => setSettingsOpen(false)}
                />
            )}
        </div>
    );
}

export default App;