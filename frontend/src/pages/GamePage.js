import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { getGameMeta, getGameComponent } from '../games/registry';
import './GamePage.css';

export default function GamePage({ currentUser }) {
  const { gameId: gameType } = useParams();
  const navigate = useNavigate();
  const { state, players, loading, error, startGame, submitMove, restart } = useGameState();

  const meta = (() => {
    try { return getGameMeta(gameType); }
    catch { return null; }
  })();

  useEffect(() => {
    if (!currentUser) { navigate('/'); return; }
    if (!meta) { navigate('/'); return; }

    const playerList = [
      { id: 'p1', name: currentUser },
      { id: 'p2', name: 'Player 2' },
    ];
    startGame(gameType, playerList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, currentUser]);

  const GameComponent = (() => {
    try { return getGameComponent(gameType); }
    catch { return null; }
  })();

  function handleMove(move) {
    if (!state) return;
    submitMove(state.currentPlayer, move);
  }

  if (!meta || !GameComponent) {
    return <div className="game-page-error">Unknown game.</div>;
  }

  return (
    <div className="game-page">
      <header className="game-page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Back</button>
        <h2>{meta.label}</h2>
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
