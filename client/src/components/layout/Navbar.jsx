import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { SoundToggle } from '../ui/SoundToggle.jsx';

const links = [
  { to: '/', label: 'home', end: true },
  { to: '/leaderboard', label: 'leaderboard' },
];

export function Navbar() {
  const { user, isAuthed, isGuest, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const authed = isAuthed() && !isGuest();

  return (
    <header className="flex items-center justify-between py-6">
      <NavLink to="/" className="group flex items-center gap-2">
        <span className="text-2xl font-bold text-accent">tr</span>
        <span className="text-lg font-semibold text-text group-hover:text-accent">
          typeracer
        </span>
      </NavLink>

      <nav className="flex items-center gap-6 text-sm">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
          >
            {l.label}
          </NavLink>
        ))}

        {authed ? (
          <>
            <NavLink
              to={`/profile/${user.username}`}
              className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
            >
              profile
            </NavLink>
            <button type="button" onClick={handleLogout} className="nav-link">
              logout
            </button>
            <span className="text-secondary">
              {user.username} · <span className="text-accent">{user.rating}</span>
            </span>
          </>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) => (isActive ? 'nav-link-active' : 'nav-link')}
          >
            login
          </NavLink>
        )}

        <SoundToggle />
      </nav>
    </header>
  );
}
