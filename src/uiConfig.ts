export const themes = {
    classic:   {'--tile-light': '#f0d9b5', '--tile-mid': '#b58863', '--tile-dark': '#8b4513'},
    ocean:     {'--tile-light': '#a8d8ea', '--tile-mid': '#4a90d9', '--tile-dark': '#1a4a7a'},
    grass:     {'--tile-light': '#75994D', '--tile-mid': '#F3F3F4', '--tile-dark': '#254D32'},
    blue:      {'--tile-light': '#547396', '--tile-mid': '#F4F3D4', '--tile-dark': '#969696'},
    green:     {'--tile-light': '#7D945D', '--tile-mid': '#EEEED5', '--tile-dark': '#172815'},
    bubblegum: {'--tile-light': '#F6D9DD', '--tile-mid': '#FFFFFF', '--tile-dark': '#CA2E55'},
    light:     {'--tile-light': '#ABABAB', '--tile-mid': '#DCDCDC', '--tile-dark': '#313638'},
    orange:    {'--tile-light': '#C68D37', '--tile-mid': '#F8E4B8', '--tile-dark': '#423B0B'},
    overlay:   {'--tile-light': '#282828', '--tile-mid': '#5E5E5E', '--tile-dark': '#EDCBB1'},
    purple:    {'--tile-light': '#8579B3', '--tile-mid': '#EFEFEF', '--tile-dark': '#4C1E4F'},
    red:       {'--tile-light': '#AE5A4B', '--tile-mid': '#ECD8C2', '--tile-dark': '#36151E'},
    sky:       {'--tile-light': '#C6D6E1', '--tile-mid': '#EFEFEF', '--tile-dark': '#586994'},
    tan:       {'--tile-light': '#CCA472', '--tile-mid': '#E7CAA7', '--tile-dark': '#5F5449'},
} as const;

export type ThemeName = keyof typeof themes;

// Shared chessglyph codepoints for landing page nav icons.
export const NAV_ICONS = {
    play:     '\u004A',
    analysis: '\u0024',
    puzzles:  '\u03DE',
    settings: '\u03F7',
} as const;
