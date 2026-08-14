import { useEffect, useState } from 'react';
import { getLeaderboard } from '../api/gameApi';
import './LeaderboardModal.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardModal({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getLeaderboard(5)
      .then(setEntries)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        <button className="leaderboard-close" onClick={onClose} aria-label="close">×</button>
        <h2 className="leaderboard-title">🏆 top players</h2>

        {loading && <div className="spinner" aria-label="loading leaderboard" />}
        {error && <p className="leaderboard-error">could not reach the server. is the backend running?</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="leaderboard-empty">no games finished yet — be the first!</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <ol className="leaderboard-list">
            {entries.map((entry, i) => (
              <li key={entry.name} className="leaderboard-row">
                <span className="leaderboard-rank">{MEDALS[i] ?? `#${i + 1}`}</span>
                <span className="leaderboard-name">{entry.name}</span>
                <span className="leaderboard-record">
                  {entry.win ?? 0}W {entry.tie ?? 0}T {entry.loss ?? 0}L
                </span>
                <span className="leaderboard-score">{entry.score} pts</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
