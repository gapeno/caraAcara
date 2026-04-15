/**
 * Game registry — the single place to register new games.
 *
 * Each entry must provide:
 *   id          — unique string key used in routes and API calls
 *   label       — display name
 *   description — short description for the game selection screen
 *   minPlayers  — minimum number of players
 *   maxPlayers  — maximum number of players
 *   logic       — { initialState, isValidMove, applyMove, getStatus }
 *   component   — lazy-loaded React component (added in Phase 2)
 */

import * as tictactoeLogic from './tictactoe/logic';

const REGISTRY = {
  tictactoe: {
    id: 'tictactoe',
    label: 'Tic-Tac-Toe',
    description: 'Classic 3×3 strategy game. First to three in a row wins.',
    minPlayers: 2,
    maxPlayers: 2,
    logic: tictactoeLogic,
  },
  // Phase 2 — add more games here:
  // minesweeper: { ... },
  // guessWho: { ... },
};

export function getGameLogic(gameType) {
  const entry = REGISTRY[gameType];
  if (!entry) throw new Error(`Unknown game type: "${gameType}"`);
  return entry.logic;
}

export function getGameMeta(gameType) {
  const entry = REGISTRY[gameType];
  if (!entry) throw new Error(`Unknown game type: "${gameType}"`);
  const { logic, ...meta } = entry;
  return meta;
}

export function getAllGames() {
  return Object.values(REGISTRY).map(({ logic, ...meta }) => meta);
}
