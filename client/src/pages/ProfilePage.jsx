import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { Stat } from '../components/ui/Stat.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';

function Avatar({ username }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-2xl font-bold text-accent">
      {username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ProfilePage() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api
      .profile(username)
      .then((res) => active && (setData(res), setStatus('done')))
      .catch((err) => active && (setError(err.message), setStatus('error')));
    return () => {
      active = false;
    };
  }, [username]);

  if (status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }
  if (status === 'error') {
    return <p className="py-16 text-center text-error">{error}</p>;
  }

  const { user, recentMatches } = data;

  return (
    <div className="flex flex-1 flex-col gap-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-5">
        <Avatar username={user.username} />
        <div>
          <h1 className="text-2xl font-semibold text-text">{user.username}</h1>
          <p className="text-sm text-secondary">
            rank <span className="text-accent">{ordinal(user.rank)}</span> · rating{' '}
            <span className="text-accent">{user.rating}</span>
            {user.country && ` · ${user.country}`}
          </p>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="games" value={user.gamesPlayed} />
        <Stat label="wins" value={user.wins} accent />
        <Stat label="win rate" value={`${user.winRate}%`} />
        <Stat label="best streak" value={user.bestStreak} />
        <Stat label="avg wpm" value={user.averageWpm} accent />
        <Stat label="highest wpm" value={user.highestWpm} />
        <Stat label="avg accuracy" value={`${user.averageAccuracy}%`} />
        <Stat label="chars typed" value={user.totalChars.toLocaleString()} />
      </div>

      {/* Recent matches */}
      <div>
        <h2 className="mb-3 text-lg font-medium text-text">recent matches</h2>
        {recentMatches.length === 0 ? (
          <p className="text-sm text-secondary">No matches played yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentMatches.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-sub/50 px-4 py-3 text-sm"
              >
                <span
                  className={`w-10 font-bold ${m.placement === 1 ? 'text-accent' : 'text-secondary'}`}
                >
                  {m.placement ? ordinal(m.placement) : '—'}
                </span>
                <span className="text-text">{m.wpm} wpm</span>
                <span className="text-secondary">{Math.round(m.accuracy)}% acc</span>
                <span className="text-secondary">
                  vs {m.opponents.map((o) => o.username).join(', ') || 'unknown'}
                </span>
                <span
                  className={`${
                    m.pointsGained > 0 ? 'text-accent' : m.pointsGained < 0 ? 'text-error' : 'text-secondary'
                  }`}
                >
                  {m.pointsGained > 0 ? '+' : ''}
                  {m.pointsGained}
                </span>
                <span className="ml-auto text-secondary">
                  {new Date(m.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
