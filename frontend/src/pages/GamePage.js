import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { getGameComponent } from '../games/components';
import { joinGame } from '../api/gameApi';
import './GamePage.css';

export default function GamePage({ currentUser }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { label, gameType, players, state, loading, error, loadGame, submitMove, restart } = useGameState();

  const [myRole, setMyRole] = useState(null);
  const [copied, setCopied] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/', { state: { next: location.pathname } });
      return;
    }
    if (initialized.current) return;
    initialized.current = true;

    const stored = localStorage.getItem(`caraAcara_role_${sessionId}`);
    const role = stored ?? 'p2';
    if (!stored) {
      // Joining via a shared link, not the creator — sync our real name
      // onto the game record (created with a "Player 2" placeholder).
      localStorage.setItem(`caraAcara_role_${sessionId}`, 'p2');
      joinGame(sessionId, 'p2', currentUser).catch(() => {});
    }
    setMyRole(role);

    loadGame(sessionId);
  }, [sessionId, currentUser, navigate, location.pathname, loadGame]);

  const GameComponent = getGameComponent(gameType);
  const isMyTurn = state?.current_player === myRole;
  const shareUrl = `${window.location.origin}/game/${sessionId}`;
  const myPlayer = players.find((p) => p.id === myRole);
  const opponentPlayer = players.find((p) => p.id !== myRole);
  const opponentJoined = opponentPlayer && opponentPlayer.name !== 'Player 2';

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

  return (
    <div className="game-page">
      <header className="game-page-header">
        <button className="btn-back" onClick={() => navigate('/')}>← back</button>
        <h2>{label ?? gameType ?? '…'}</h2>
        {myPlayer && (
          <span className="player-chip">
            {myPlayer.name} <span className="player-chip-role">({myRole === 'p1' ? 'P1' : 'P2'})</span>
          </span>
        )}
      </header>

      {myRole === 'p1' && state?.status === 'in_progress' && !opponentJoined && (
        <div className="share-banner">
          <span className="share-label">share with {opponentPlayer?.name ?? 'friend'}</span>
          <code className="share-url">{shareUrl}</code>
          <button className="btn-copy" onClick={handleCopy}>
            {copied ? '✓ copied' : 'copy link'}
          </button>
        </div>
      )}

      {loading && !state && <div className="loading">loading…</div>}
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
