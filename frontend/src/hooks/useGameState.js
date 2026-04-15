/**
 * useGameState — wraps all game API calls and exposes clean state to components.
 * Components never touch gameApi directly — they only talk to this hook.
 */

import { useState, useCallback } from 'react';
import * as gameApi from '../api/gameApi';

export function useGameState() {
  const [gameId, setGameId] = useState(null);
  const [gameType, setGameType] = useState(null);
  const [label, setLabel] = useState(null);
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startGame = useCallback(async (type, playerList) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gameApi.createGame(type, playerList);
      setGameId(result.gameId);
      setGameType(result.gameType);
      setLabel(result.label ?? null);
      setPlayers(result.players);
      setState(result.state);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitMove = useCallback(async (playerId, move) => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await gameApi.makeMove(gameId, playerId, move);
      setState(result.state);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const restart = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await gameApi.resetGame(gameId);
      setState(result.state);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  return { gameId, gameType, label, players, state, loading, error, startGame, submitMove, restart };
}
