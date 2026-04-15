/**
 * Tic-Tac-Toe — pure game logic (no React, no side effects).
 *
 * State shape:
 * {
 *   board: Array(9),        // flat 3x3; null | playerId
 *   players: string[],      // [p1Id, p2Id]
 *   currentPlayer: string,
 *   status: 'in_progress' | 'win' | 'draw',
 *   winner: string | null,
 *   winLine: number[] | null,
 * }
 */

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winLine: [a, b, c] };
    }
  }
  return null;
}

export function initialState(players) {
  const ids = players.map((p) => p.id);
  return {
    board: Array(9).fill(null),
    players: ids,
    currentPlayer: ids[0],
    status: 'in_progress',
    winner: null,
    winLine: null,
  };
}

/** move: { index: number } */
export function isValidMove(state, move, playerId) {
  if (state.status !== 'in_progress') return false;
  if (state.currentPlayer !== playerId) return false;
  const { index } = move;
  if (typeof index !== 'number' || index < 0 || index > 8) return false;
  return state.board[index] === null;
}

export function applyMove(state, move, playerId) {
  const board = [...state.board];
  board[move.index] = playerId;

  const winResult = checkWinner(board);
  if (winResult) {
    return { ...state, board, status: 'win', winner: winResult.winner, winLine: winResult.winLine };
  }

  if (board.every((cell) => cell !== null)) {
    return { ...state, board, status: 'draw' };
  }

  const nextIdx = (state.players.indexOf(playerId) + 1) % state.players.length;
  return { ...state, board, currentPlayer: state.players[nextIdx] };
}

export function getStatus(state) {
  return {
    status: state.status,
    winner: state.winner,
    winLine: state.winLine,
    currentPlayer: state.currentPlayer,
  };
}
