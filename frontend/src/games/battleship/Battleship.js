import './Battleship.css';

export default function Battleship({ state, players, myRole, onMove, onRestart }) {
  const { boards, cols, current_player, status, winner } = state;

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const currentPlayerName = playerMap[current_player]?.name ?? current_player;
  const winnerName = winner ? (playerMap[winner]?.name ?? winner) : null;
  const opponent = players.find((p) => p.id !== myRole);
  const myBoard = boards[myRole];
  const enemyBoard = opponent ? boards[opponent.id] : null;

  function statusMessage() {
    if (status === 'win') return `${winnerName} wins!`;
    return `${currentPlayerName}'s turn`;
  }

  function handleFire(row, col) {
    if (status !== 'in_progress') return;
    if (enemyBoard[row][col].hit) return;
    onMove({ row, col });
  }

  function renderGrid(board, own) {
    return (
      <div className="bs-grid" style={{ '--cols': cols }}>
        {board.map((rowCells, r) =>
          rowCells.map((cell, c) => {
            // Own cells always show ships; enemy cells only reveal a ship
            // once it's been hit — unhit enemy ships stay hidden.
            const showShip = own ? cell.ship : cell.hit && cell.ship;
            const classes = ['bs-cell'];
            if (showShip) classes.push('ship');
            if (cell.hit) classes.push(cell.ship ? 'hit' : 'miss');

            return (
              <button
                key={`${r}-${c}`}
                className={classes.join(' ')}
                onClick={own ? undefined : () => handleFire(r, c)}
                disabled={own || cell.hit || status !== 'in_progress'}
                aria-label={`Row ${r + 1}, column ${c + 1}${cell.hit ? (cell.ship ? ', hit' : ', miss') : ''}`}
              >
                {cell.hit ? (cell.ship ? '💥' : '•') : showShip ? '🚢' : ''}
              </button>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="bs-container">
      <div className={`bs-status ${status !== 'in_progress' ? 'game-over' : ''}`}>
        {statusMessage()}
      </div>

      <div className="bs-boards">
        <div className="bs-board-panel">
          <h3 className="bs-board-title">enemy waters</h3>
          {enemyBoard && renderGrid(enemyBoard, false)}
        </div>
        <div className="bs-board-panel">
          <h3 className="bs-board-title">your fleet</h3>
          {myBoard && renderGrid(myBoard, true)}
        </div>
      </div>

      {status !== 'in_progress' && (
        <button className="btn btn-primary bs-restart" onClick={onRestart}>
          Play Again
        </button>
      )}
    </div>
  );
}
