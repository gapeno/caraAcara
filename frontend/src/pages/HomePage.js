import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllGames } from '../games/registry';
import './HomePage.css';

const GAMES = getAllGames();

export default function HomePage({ onLogin, currentUser }) {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  function handleLogin(e) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    onLogin(name);
  }

  function handleSelectGame(gameId) {
    navigate(`/game/${gameId}`);
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="logo">cara<span>A</span>cara</h1>
        <p className="tagline">face to face multiplayer games over the clod</p>
      </header>

      {!currentUser ? (
        <section className="login-section">
          <h2>Enter your name to play</h2>
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="text"
              className="login-input"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={!username.trim()}>
              Let's Play
            </button>
          </form>
        </section>
      ) : (
        <section className="game-select-section">
          <h2>Welcome, <span className="username">{currentUser}</span></h2>
          <p className="subtitle">Pick a game to start</p>
          <div className="game-grid">
            {GAMES.map((game) => (
              <button
                key={game.id}
                className="game-card"
                onClick={() => handleSelectGame(game.id)}
              >
                <div className="game-card-icon">{game.icon ?? '🎮'}</div>
                <h3>{game.label}</h3>
                <p>{game.description}</p>
                <span className="players-badge">{game.minPlayers}–{game.maxPlayers} players</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

