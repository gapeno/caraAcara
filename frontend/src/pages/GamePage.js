import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { getGameComponent } from '../games/components';
import './GamePage.css';

export default function GamePage({ currentUser }) {
  const { gameId: gameType } = useParams();
  const navigate = useNavigate();
  const { state, players, label, loading, error, startGame, submitMove, restart } = useGameState();

  const GameComponent = getGameComponent(gameType);

  useEffect(() => {
    if (!currentUser) { navigate('/'); return; }
    if (!GameComponent) { navigate('/'); return; }

    const playerList = [
      { id: 'p1', name: currentUser },
      { id: 'p2', name: 'Player 2' },
    ];
    startGame(gameType, playerList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, currentUser]);

  function handleMove(move) {
    if (!state) return;
    submitMove(state.current_player, move);
  }

  if (!GameComponent) {
    return <div className="game-page-error">Unknown game.</div>;
  }

  return (
    <div className="game-page">
      <header className="game-page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Back</button>
        <h2>{label ?? gameType}</h2>
        <div />
      </header>

      {loading && !state && <div className="loading">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}

      {state && (
        <GameComponent
          state={state}
          players={players}
          onMove={handleMove}
          onRestart={restart}
        />
      )}
    </div>
  );
}
