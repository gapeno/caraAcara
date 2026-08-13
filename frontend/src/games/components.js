/**
 * Maps game type IDs → React UI components.
 * Pure UI wiring — no game logic lives here.
 * Adding a new game: import its component and add one line below.
 */

import TicTacToe from './tictactoe/TicTacToe';
import Minesweeper from './minesweeper/Minesweeper';
import DotsAndBoxes from './dotsandboxes/DotsAndBoxes';
import ConnectFour from './connectfour/ConnectFour';

const COMPONENTS = {
  tictactoe: TicTacToe,
  minesweeper: Minesweeper,
  dotsandboxes: DotsAndBoxes,
  connectfour: ConnectFour,
  // guess_who: GuessWho,
};

export function getGameComponent(gameType) {
  return COMPONENTS[gameType] ?? null;
}
