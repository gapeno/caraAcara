import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem('caraAcara_user') || null
  );

  function handleLogin(name) {
    localStorage.setItem('caraAcara_user', name);
    setCurrentUser(name);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage currentUser={currentUser} onLogin={handleLogin} />} />
        <Route path="/lobby/:gameType" element={<LobbyPage currentUser={currentUser} />} />
        <Route path="/game/:sessionId" element={<GamePage currentUser={currentUser} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
