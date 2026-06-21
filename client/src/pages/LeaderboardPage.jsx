import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Spinner } from '../components/ui/Spinner.jsx';

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api
      .leaderboard(page)
      .then((res) => active && (setData(res), setStatus('done')))
      .catch((err) => active && (setError(err.message), setStatus('error')));
    return () => {
      active = false;
    };
  }, [page]);

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">leaderboard</h1>
        <p className="mt-1 text-sm text-secondary">
          ranked by rating · minimum {data?.minGames ?? 20} games played
        </p>
      </div>

      {status === 'loading' && (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      )}
      {status === 'error' && <p className="text-error">{error}</p>}

      {status === 'done' && data.leaderboard.length === 0 && (
        <p className="text-secondary">No ranked players yet. Be the first to play 20 games!</p>
      )}

      {status === 'done' && data.leaderboard.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-secondary">
              <tr className="border-b border-secondary/20">
                <th className="py-3 pr-4 font-medium">#</th>
                <th className="py-3 pr-4 font-medium">player</th>
                <th className="py-3 pr-4 text-right font-medium">rating</th>
                <th className="py-3 pr-4 text-right font-medium">avg wpm</th>
                <th className="py-3 pr-4 text-right font-medium">peak</th>
                <th className="py-3 pr-4 text-right font-medium">win %</th>
                <th className="py-3 text-right font-medium">games</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((row) => (
                <tr key={row.username} className="border-b border-secondary/10 hover:bg-sub/40">
                  <td className="py-3 pr-4 font-bold text-accent">{row.rank}</td>
                  <td className="py-3 pr-4">
                    <Link className="hover:text-accent" to={`/profile/${row.username}`}>
                      {row.username}
                    </Link>
                    {row.country && (
                      <span className="ml-2 text-xs text-secondary">{row.country}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">{row.rating}</td>
                  <td className="py-3 pr-4 text-right">{row.averageWpm}</td>
                  <td className="py-3 pr-4 text-right text-secondary">{row.peakWpm}</td>
                  <td className="py-3 pr-4 text-right text-secondary">{row.winRate}%</td>
                  <td className="py-3 text-right text-secondary">{row.games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'done' && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            className="btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← prev
          </button>
          <span className="text-sm text-secondary">
            page {data.page} of {data.totalPages}
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            next →
          </button>
        </div>
      )}
    </div>
  );
}
