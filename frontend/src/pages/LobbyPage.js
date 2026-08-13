import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGame } from '../api/gameApi';
import './LobbyPage.css';

export default function LobbyPage({ currentUser }) {
  const { gameType } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!currentUser) {
    navigate('/', { replace: true });
    return null;
  }

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const players = [
        { id: 'p1', name: currentUser },
        { id: 'p2', name: 'Player 2' },
      ];
      const result = await createGame(gameType, players);
      localStorage.setItem(`caraAcara_role_${result.gameId}`, 'p1');
      navigate(`/game/${result.gameId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="lobby-page">
      <button className="btn-back" onClick={() => navigate('/')}>← Back</button>

      <div className="lobby-card">
        <h2 className="lobby-title">{gameType}</h2>

        <div className="lobby-player">
          <span className="lobby-label">you</span>
          <span className="lobby-name">{currentUser}</span>
          <span className="lobby-badge">Player 1</span>
        </div>

        {error && <p className="lobby-error">{error}</p>}
        <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? 'creating…' : 'create game'}
        </button>

        <p className="lobby-hint">
          you'll get a link to share with your friend
        </p>
      </div>
    </div>
  );
}
