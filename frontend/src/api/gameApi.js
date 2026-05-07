/**
 * Game API client — all game logic lives in the backend.
 * The frontend never computes state; it only sends requests and renders responses.
 *
 * Endpoints:
 *   GET  /games                → listGames
 *   POST /games                → createGame
 *   GET  /games/:id            → getGameState
 *   POST /games/:id/moves      → makeMove
 *   POST /games/:id/reset      → resetGame
 */

// Empty string → relative paths, so the browser resolves against its current origin.
// In production the frontend and API share the same CloudFront domain, so no URL is needed.
// In local dev, REACT_APP_API_URL=http://localhost:8000 (set in .env.development).
const BASE_URL = process.env.REACT_APP_API_URL || '';

export function getGameWsUrl(gameId) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const base = BASE_URL
    ? BASE_URL.replace(/^http/, 'ws')
    : `${proto}://${window.location.host}`;
  return `${base}/games/${gameId}/ws`;
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Request failed');
  }

  return res.json();
}

/** GET /games — list all available game types. */
export async function listGames() {
  return request('GET', '/games');
}

/** POST /games — create a new game session. */
export async function createGame(gameType, players) {
  const data = await request('POST', '/games', { game_type: gameType, players });
  return {
    gameId: data.id,
    gameType: data.game_type,
    label: data.label,
    players: data.players,
    state: data.state,
  };
}

/** GET /games/:id — get current game state. */
export async function getGameState(gameId) {
  const data = await request('GET', `/games/${gameId}`);
  return { gameId: data.id, gameType: data.game_type, label: data.label, players: data.players, state: data.state };
}

/** POST /games/:id/moves — apply a player move. */
export async function makeMove(gameId, playerId, move) {
  const data = await request('POST', `/games/${gameId}/moves`, { player_id: playerId, move });
  return { gameId: data.id, gameType: data.game_type, players: data.players, state: data.state };
}

/** POST /games/:id/reset — restart the game. */
export async function resetGame(gameId) {
  const data = await request('POST', `/games/${gameId}/reset`);
  return { gameId: data.id, gameType: data.game_type, players: data.players, state: data.state };
}
