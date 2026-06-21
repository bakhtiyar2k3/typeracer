import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout.jsx';
import { useAuthStore } from './store/authStore.js';
import { sound } from './services/sound.js';
import HomePage from './pages/HomePage.jsx';
import RacePage from './pages/RacePage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  const refresh = useAuthStore((s) => s.refresh);

  // Re-sync the persisted profile on load so the navbar rating is current.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Decode keystroke sounds up front so the first keypress is instant.
  useEffect(() => {
    sound.preload();
  }, []);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/race" element={<RacePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
