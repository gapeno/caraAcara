/**
 * Game API stub — mirrors the REST contract the real backend will implement.
 *
 * Every function returns a Promise so swapping for real fetch() calls later
 * requires no changes in callers.
 *
 * Phase 3 endpoints:
 *   POST /games             → createGame
 *   POST /games/:id/join    → joinGame
 *   POST /games/:id/moves   → makeMove
 *   GET  /games/:id         → getGameState
 *   POST /games/:id/reset   → resetGame
 */

import { getGameLogic } from '../games/registry';

// In-memory store for the POC
const store = {
  games: {},
  nextId: 1,
};

function generateId() {
  return `game-${store.nextId++}`;
}

/** POST /games */
export async function createGame(gameType, players) {
  const logic = getGameLogic(gameType);
  const gameId = generateId();
  const state = logic.initialState(players);

  store.games[gameId] = { id: gameId, gameType, players, state };
  return { gameId, gameType, players, state };
}

/** GET /games/:id */
export async function getGameState(gameId) {
  const game = store.games[gameId];
  if (!game) throw new Error(`Game ${gameId} not found`);
  return { ...game };
}

/** POST /games/:id/moves */
export async function makeMove(gameId, playerId, move) {
  const game = store.games[gameId];
  if (!game) throw new Error(`Game ${gameId} not found`);

  const logic = getGameLogic(game.gameType);
  if (!logic.isValidMove(game.state, move, playerId)) {
    throw new Error('Invalid move');
  }

  game.state = logic.applyMove(game.state, move, playerId);
  return { ...game };
}

/** POST /games/:id/reset */
export async function resetGame(gameId) {
  const game = store.games[gameId];
  if (!game) throw new Error(`Game ${gameId} not found`);

  const logic = getGameLogic(game.gameType);
  game.state = logic.initialState(game.players);
  return { ...game };
}
