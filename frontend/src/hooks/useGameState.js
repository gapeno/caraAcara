import { useState, useCallback, useRef, useEffect } from 'react';
import * as gameApi from '../api/gameApi';

export function useGameState() {
  const [gameId, setGameId] = useState(null);
  const [gameType, setGameType] = useState(null);
  const [label, setLabel] = useState(null);
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  // Open a WebSocket for the current game; close it when gameId changes or unmounts
  useEffect(() => {
    if (!gameId) return;

    const ws = new WebSocket(gameApi.getGameWsUrl(gameId));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setGameType(data.game_type);
      setLabel(data.label ?? null);
      setPlayers(data.players);
      setState(data.state);
    };

    ws.onerror = () => setError('Connection lost — please refresh');

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [gameId]);

  const loadGame = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gameApi.getGameState(id);
      setGameId(id);
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
    setError(null);
    try {
      await gameApi.makeMove(gameId, playerId, move);
      // State update arrives via WebSocket broadcast to both players
    } catch (err) {
      setError(err.message);
    }
  }, [gameId]);

  const restart = useCallback(async () => {
    if (!gameId) return;
    setError(null);
    try {
      await gameApi.resetGame(gameId);
      // State update arrives via WebSocket broadcast to both players
    } catch (err) {
      setError(err.message);
    }
  }, [gameId]);

  return { gameId, gameType, label, players, state, loading, error, loadGame, submitMove, restart };
}
