import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listGames } from '../api/gameApi';
import './HomePage.css';

export default function HomePage({ onLogin, currentUser }) {
  const [username, setUsername] = useState('');
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) return;
    setGamesError(false);
    setGamesLoading(true);
    listGames()
      .then(setGames)
      .catch(() => setGamesError(true))
      .finally(() => setGamesLoading(false));
  }, [currentUser]);

  function handleLogin(e) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    onLogin(name);
    const next = location.state?.next;
    if (next) navigate(next);
  }

  function handleSelectGame(gameId) {
    navigate(`/lobby/${gameId}`);
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="logo">cara<span>A</span>cara</h1>
        <p className="tagline">face to face multiplayer games over the cloud</p>
      </header>

      {!currentUser ? (
        <section className="login-section">
          <h2>enter your name to play</h2>
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="text"
              className="login-input"
              placeholder="..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!username.trim()}>
              let's play
            </button>
          </form>
        </section>
      ) : (
        <section className="game-select-section">
          <h2>welcome, <span className="username">{currentUser}</span></h2>
          <p className="subtitle">pick a game to start</p>
          {gamesError && <p className="games-error">could not reach the server. is the backend running?</p>}
          {gamesLoading && !gamesError && <div className="spinner" aria-label="loading games" />}
          <div className="game-grid">
            {!gamesLoading && games.map((game) => (
              <button
                key={game.id}
                className="game-card"
                onClick={() => handleSelectGame(game.id)}
              >
                <div className="game-card-icon">{game.icon ?? '🎮'}</div>
                <h3>{game.label}</h3>
                <p>{game.description}</p>
                {game.min_players !== game.max_players && (
                  <span className="players-badge">{game.min_players}–{game.max_players} players</span>
                )}
                {game.min_players == 1 && game.min_players == game.max_players && (
                  <span className="players-badge">{game.min_players} player</span>
                )}
                {game.min_players > 1 && game.min_players == game.max_players && (
                  <span className="players-badge">{game.min_players} players</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
