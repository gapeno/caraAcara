import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { getGameComponent } from '../games/components';
import './GamePage.css';

export default function GamePage({ currentUser }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { label, gameType, players, state, loading, error, loadGame, refreshGame, submitMove, restart } = useGameState();

  const [myRole, setMyRole] = useState(null);
  const [copied, setCopied] = useState(false);
  const initialized = useRef(false);

  // Redirect to login if not logged in, preserving this URL so they come back
  useEffect(() => {
    if (!currentUser) {
      navigate('/', { state: { next: location.pathname } });
    }
  }, [currentUser, navigate, location.pathname]);

  // Load game once and determine player role
  useEffect(() => {
    if (!currentUser || initialized.current) return;
    initialized.current = true;

    const stored = localStorage.getItem(`caraAcara_role_${sessionId}`);
    const role = stored ?? 'p2';
    if (!stored) localStorage.setItem(`caraAcara_role_${sessionId}`, 'p2');
    setMyRole(role);

    loadGame(sessionId);
  }, [sessionId, currentUser, loadGame]);

  // Poll every 2s while the game is active
  useEffect(() => {
    if (!state || state.status !== 'in_progress') return;
    const id = setInterval(() => refreshGame(sessionId), 2000);
    return () => clearInterval(id);
  }, [sessionId, state?.status, refreshGame]);

  const GameComponent = getGameComponent(gameType);
  const isMyTurn = state?.current_player === myRole;
  const shareUrl = `${window.location.origin}/game/${sessionId}`;

  function handleMove(move) {
    if (!isMyTurn) return;
    submitMove(myRole, move);
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!GameComponent && gameType) {
    return <div className="game-page-error">Unknown game.</div>;
  }

  const myPlayer = players.find((p) => p.id === myRole);
  const opponentPlayer = players.find((p) => p.id !== myRole);

  return (
    <div className="game-page">
      <header className="game-page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Back</button>
        <h2>{label ?? gameType ?? '…'}</h2>
        {myPlayer && (
          <span className="player-chip">
            {myPlayer.name} <span className="player-chip-role">({myRole === 'p1' ? 'P1' : 'P2'})</span>
          </span>
        )}
      </header>

      {myRole === 'p1' && state && state.status === 'in_progress' && (
        <div className="share-banner">
          <span className="share-label">share with {opponentPlayer?.name ?? 'opponent'}</span>
          <code className="share-url">{shareUrl}</code>
          <button className="btn-copy" onClick={handleCopy}>
            {copied ? '✓ copied' : 'copy link'}
          </button>
        </div>
      )}

      {loading && !state && <div className="loading">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}

      {state && GameComponent && (
        <GameComponent
          state={state}
          players={players}
          myRole={myRole}
          isMyTurn={isMyTurn}
          onMove={handleMove}
          onRestart={restart}
        />
      )}
    </div>
  );
}
