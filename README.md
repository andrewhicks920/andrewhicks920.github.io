# Hexagonal Chess

A fully playable implementation of [**Glinski's hexagonal chess**](https://en.wikipedia.org/wiki/Hexagonal_chess#Gli%C5%84ski). 
Built with React, TypeScript, and SVG rendering.

## About

Glinski's hexagonal chess is a two-player chess variant invented by Władysław Gliński in 1936. The game is played on a hexagonal board with 91 cells arranged in an 11-file, three-color layout. All standard chess pieces are present, with movement rules adapted to the hexagonal geometry.

## Features

- Full implementation of Glinski's rules including:
  - All six piece types with hex-adapted movement
  - Check, checkmate, and stalemate detection
  - En passant captures
  - Pawn promotion with piece-selection dialog
  - Stalemate scoring (¾ point to the delivering player per Glinski's rules)
- SVG-rendered board with 14 built-in color themes
- Visual move highlighting — legal moves shown on piece selection
- Game status bar — turn indicator, check warnings, and game-over messages
- Captured pieces display
- Reset button to start a new game

## Getting Started

**Prerequisites:** Node.js and npm

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command           | Description                                     |
|-------------------|-------------------------------------------------|
| `npm run dev`     | Start the development server with hot reloading |
| `npm run build`   | Build for production (output to `/dist`)        |
| `npm run preview` | Preview the production build locally            |
| `npm run lint`    | Run ESLint                                      |

## Tech Stack

- **React 19** — Component-based UI
- **TypeScript 6** — Static typing
- **Vite 8** — Build tool and dev server
- **SVG** — Board and piece rendering

## Project Structure

```
src/
├── game/
│   ├── types.ts        # Core types (Piece, Color, Position, Cell)
│   ├── board.ts        # Hex coordinate math and board generation
│   ├── pieces.ts       # Movement logic for each piece type
│   └── gameLogic.ts    # Check, checkmate, stalemate detection
├── components/
│   ├── Board/          # Main SVG board renderer
│   ├── Tile/           # Individual hex tile and piece rendering
│   ├── GameStatus/     # Status bar component
│   └── CapturedPieces/ # Captured pieces display
├── hooks/
│   └── useGame.ts      # All game state management
├── themes.ts           # Color theme definitions
└── App.tsx             # Root component
```

## Implementation Notes

The board uses **axial coordinates** `(q, r)` where cells satisfy `max(|q|, |r|, |q+r|) ≤ 5`, producing exactly 91 valid cells. 
Cell colors are assigned using `(q - r) mod 3`, guaranteeing bishops always remain on the same color.

Move generation produces pseudo-legal moves that are then filtered to remove any that leave the king in check.
