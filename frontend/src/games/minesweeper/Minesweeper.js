import { useState } from 'react';
import './Minesweeper.css';

const NUMBER_COLORS = ['', '#1a73e8', '#388e3c', '#d32f2f', '#1565c0', '#b71c1c', '#00838f', '#212121', '#757575'];

export default function Minesweeper({ state, players, onMove, onRestart }) {
  const [flagMode, setFlagMode] = useState(false);

  const { board, status, mines_count, flags_count, cols, current_player, scores, winner } = state;
  const minesRemaining = mines_count - flags_count;

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const winnerName = winner ? (playerMap[winner]?.name ?? winner) : null;

  function handleCellClick(e, row, col) {
    e.preventDefault();
    if (status !== 'in_progress') return;
    const cell = board[row][col];
    if (cell.revealed) return;
    const isFlagging = e.type === 'contextmenu' || flagMode;
    onMove({ action: isFlagging ? 'flag' : 'reveal', row, col });
  }

  function renderCell(cell, row, col) {
    let content = null;
    let className = 'ms-cell';

    if (cell.revealed) {
      className += ' revealed';
      if (cell.is_mine) {
        content = '💣';
        className += ' mine';
      } else if (cell.adjacent_mines > 0) {
        content = <span style={{ color: NUMBER_COLORS[cell.adjacent_mines] }}>{cell.adjacent_mines}</span>;
      }
    } else if (cell.flagged) {
      content = '🚩';
      className += ' flagged';
    }

    return (
      <button
        key={col}
        className={className}
        onClick={(e) => handleCellClick(e, row, col)}
        onContextMenu={(e) => handleCellClick(e, row, col)}
        disabled={cell.revealed}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="ms-container">
      {/* Players row */}
      <div className="ms-players">
        {players.map((p) => (
          <div
            key={p.id}
            className={`ms-player ${current_player === p.id && status === 'in_progress' ? 'active' : ''} ${winner === p.id ? 'winner' : ''}`}
          >
            <span className="ms-player-name">{p.name}</span>
            <span className="ms-player-score">{scores?.[p.id] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="ms-header">
        <div className="ms-counter">
          <span>💣</span>
          <span>{minesRemaining}</span>
        </div>

        <button className="ms-reset" onClick={onRestart} title="New game">
          {status === 'win' ? '😎' : status === 'loss' ? '😵' : '🙂'}
        </button>

        <button
          className={`ms-flag-toggle ${flagMode ? 'active' : ''}`}
          onClick={() => setFlagMode((f) => !f)}
          title="Toggle flag mode"
        >
          🚩
        </button>
      </div>

      {status !== 'in_progress' && (
        <div className={`ms-overlay ${status}`}>
          <p>{status === 'win' ? `🎉 ${winnerName} wins!` : `💥 ${winnerName} wins!`}</p>
          <button className="btn btn-primary" onClick={onRestart}>Play Again</button>
        </div>
      )}

      <div
        className="ms-board"
        style={{ gridTemplateColumns: `repeat(${cols}, var(--cell-size))` }}
      >
        {board.map((row, r) => row.map((cell, c) => renderCell(cell, r, c)))}
      </div>
    </div>
  );
}
