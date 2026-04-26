import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage.tsx';
import { GamePage } from './pages/GamePage.tsx';
import { type ThemeName } from './uiConfig.ts';

function App() {
    const [themeName, setThemeName] = useState<ThemeName>('classic');
    const [pieceSet, setPieceSet] = useState('neo');

    const sharedProps = {
        themeName,
        pieceSet,
        onThemeChange: setThemeName,
        onPieceSetChange: setPieceSet,
    };

    // TODO: When online mode is implemented, we can put this route back:
    // TODO: <Route path="/play/online" element={<GamePage mode="online" {...sharedProps} />} />
    return (
        <Routes>
            <Route path="/" element={<LandingPage {...sharedProps} />} />
            <Route path="/play/local" element={<GamePage mode="local" {...sharedProps} />} />
            <Route path="/play/bot" element={<GamePage mode="bot" {...sharedProps} />} />

            <Route path="/analysis" element={<GamePage mode="analysis" {...sharedProps} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
