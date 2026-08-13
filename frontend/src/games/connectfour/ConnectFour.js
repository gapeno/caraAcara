import './ConnectFour.css';

export default function ConnectFour({ state, players, onMove, onRestart }) {
  const { board, rows, cols, current_player, status, winner, win_line } = state;

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const currentPlayerName = playerMap[current_player]?.name ?? current_player;
  const winnerName = winner ? (playerMap[winner]?.name ?? winner) : null;

  const isWinCell = (row, col) =>
    win_line?.some(([r, c]) => r === row && c === col);

  const isColumnFull = (col) => board[0][col] !== null;

  function statusMessage() {
    if (status === 'win') return `${winnerName} wins!`;
    if (status === 'draw') return "It's a draw!";
    return `${currentPlayerName}'s turn`;
  }

  function handleColumnClick(col) {
    if (status !== 'in_progress') return;
    if (isColumnFull(col)) return;
    onMove({ col });
  }

  return (
    <div className="c4-container">
      <div className="c4-players">
        {players.map((p) => (
          <div
            key={p.id}
            className={`c4-player ${current_player === p.id && status === 'in_progress' ? 'active' : ''} ${winner === p.id ? 'winner' : ''}`}
          >
            <span className={`c4-disc-icon disc-${p.id}`} />
            <span className="c4-name">{p.name}</span>
          </div>
        ))}
      </div>

      <div className={`c4-status ${status !== 'in_progress' ? 'game-over' : ''}`}>
        {statusMessage()}
      </div>

      <div className="c4-board" style={{ '--cols': cols }}>
        {Array.from({ length: cols }, (_, col) => (
          <button
            key={`drop-${col}`}
            className="c4-drop"
            onClick={() => handleColumnClick(col)}
            disabled={status !== 'in_progress' || isColumnFull(col)}
            aria-label={`Drop in column ${col + 1}`}
          >
            ▼
          </button>
        ))}

        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => {
            const cell = board[row][col];
            return (
              <button
                key={`${row}-${col}`}
                className="c4-cell"
                onClick={() => handleColumnClick(col)}
                disabled={status !== 'in_progress' || isColumnFull(col)}
                aria-label={`Row ${row + 1}, column ${col + 1}${cell ? `, ${playerMap[cell]?.name ?? cell}` : ''}`}
              >
                <span
                  className={`c4-disc ${cell ? `disc-${cell}` : 'disc-empty'} ${isWinCell(row, col) ? 'win-disc' : ''}`}
                />
              </button>
            );
          })
        )}
      </div>

      {status !== 'in_progress' && (
        <button className="btn btn-primary c4-restart" onClick={onRestart}>
          Play Again
        </button>
      )}
    </div>
  );
}
