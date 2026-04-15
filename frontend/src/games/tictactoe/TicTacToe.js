import './TicTacToe.css';

const SYMBOLS = { p1: 'X', p2: 'O' };

export default function TicTacToe({ state, players, onMove, onRestart }) {
  const { board, current_player, status, winner, win_line } = state;

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const currentPlayerName = playerMap[current_player]?.name ?? current_player;
  const winnerName = winner ? (playerMap[winner]?.name ?? winner) : null;

  function statusMessage() {
    if (status === 'win') return `${winnerName} wins!`;
    if (status === 'draw') return "It's a draw!";
    return `${currentPlayerName}'s turn`;
  }

  function handleCellClick(index) {
    if (status !== 'in_progress') return;
    if (board[index] !== null) return;
    onMove({ index });
  }

  return (
    <div className="ttt-container">
      <div className="ttt-players">
        {players.map((p) => (
          <div
            key={p.id}
            className={`ttt-player ${current_player === p.id && status === 'in_progress' ? 'active' : ''} ${winner === p.id ? 'winner' : ''}`}
          >
            <span className="ttt-symbol">{SYMBOLS[p.id]}</span>
            <span className="ttt-name">{p.name}</span>
          </div>
        ))}
      </div>

      <div className={`ttt-status ${status !== 'in_progress' ? 'game-over' : ''}`}>
        {statusMessage()}
      </div>

      <div className="ttt-board">
        {board.map((cell, index) => {
          const isWinCell = win_line?.includes(index);
          return (
            <button
              key={index}
              className={`ttt-cell ${cell ? 'filled' : ''} ${isWinCell ? 'win-cell' : ''}`}
              onClick={() => handleCellClick(index)}
              disabled={!!cell || status !== 'in_progress'}
              aria-label={`Cell ${index + 1}${cell ? `, ${SYMBOLS[cell]}` : ''}`}
            >
              {cell && <span className={`ttt-mark mark-${cell}`}>{SYMBOLS[cell]}</span>}
            </button>
          );
        })}
      </div>

      {status !== 'in_progress' && (
        <button className="btn btn-primary ttt-restart" onClick={onRestart}>
          Play Again
        </button>
      )}
    </div>
  );
}
