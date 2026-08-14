import { useEffect, useState } from 'react';
import './GuessWho.css';

export default function GuessWho({ state, players, myRole, isMyTurn, onMove, onRestart }) {
  const { roster, secrets, current_player, status, winner, last_guess } = state;
  const [eliminated, setEliminated] = useState(new Set());

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const opponent = players.find((p) => p.id !== myRole);
  const currentPlayerName = playerMap[current_player]?.name ?? current_player;
  const winnerName = winner ? (playerMap[winner]?.name ?? winner) : null;
  const characterMap = Object.fromEntries(roster.map((c) => [c.id, c]));

  const mySecretId = secrets[myRole];
  const opponentHasChosen = opponent ? secrets[opponent.id] !== null : false;
  const iHaveChosen = mySecretId !== null;

  // A fresh round starts with no secret picked yet — clear personal notes.
  useEffect(() => {
    if (status === 'choosing' && !iHaveChosen) setEliminated(new Set());
  }, [status, iHaveChosen]);

  function toggleEliminated(id) {
    setEliminated((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleCardClick(id) {
    if (status === 'choosing' && !iHaveChosen) {
      onMove({ action: 'choose', character_id: id });
    } else if (status === 'in_progress' && isMyTurn) {
      onMove({ action: 'guess', character_id: id });
    }
  }

  function statusMessage() {
    if (status === 'win') return `${winnerName} wins!`;
    if (status === 'choosing') {
      if (!iHaveChosen) return 'pick your secret character';
      return `waiting for ${opponent?.name ?? 'opponent'} to pick…`;
    }
    return `${currentPlayerName}'s turn to guess`;
  }

  const clickable = (status === 'choosing' && !iHaveChosen) || (status === 'in_progress' && isMyTurn);

  return (
    <div className="gw-container">
      <div className={`gw-status ${status === 'win' ? 'game-over' : ''}`}>{statusMessage()}</div>

      {last_guess && status !== 'win' && (
        <div className={`gw-last-guess ${last_guess.correct ? 'correct' : 'wrong'}`}>
          {playerMap[last_guess.player]?.name ?? last_guess.player} guessed{' '}
          {characterMap[last_guess.character_id]?.name} — {last_guess.correct ? 'correct!' : 'wrong'}
        </div>
      )}

      {iHaveChosen && (
        <div className="gw-my-secret">
          you chose: <strong>{characterMap[mySecretId]?.emoji} {characterMap[mySecretId]?.name}</strong>
        </div>
      )}

      <div className="gw-grid">
        {roster.map((c) => {
          const isOut = eliminated.has(c.id);
          const isSolved = status === 'win' && c.id === last_guess?.character_id;
          return (
            <div key={c.id} className={`gw-card ${isOut ? 'eliminated' : ''} ${isSolved ? 'solved' : ''}`}>
              <button
                className="gw-card-main"
                onClick={() => handleCardClick(c.id)}
                disabled={!clickable}
              >
                <span className="gw-emoji">{c.emoji}</span>
                <span className="gw-name">{c.name}</span>
              </button>
              {status === 'in_progress' && (
                <button
                  className="gw-eliminate-toggle"
                  onClick={() => toggleEliminated(c.id)}
                  aria-label={`mark ${c.name} as ruled out`}
                  title="rule out (just a note for you)"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {status === 'choosing' && iHaveChosen && !opponentHasChosen && (
        <div className="spinner" aria-label="waiting for opponent" />
      )}

      {status !== 'in_progress' && status !== 'choosing' && (
        <button className="btn btn-primary gw-restart" onClick={onRestart}>
          Play Again
        </button>
      )}
    </div>
  );
}
