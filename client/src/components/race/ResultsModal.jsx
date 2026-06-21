// Post-game results: placement, wpm, accuracy, time and points for each player.
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function ResultsModal({ results, selfId, onRematch, onExit, opponentLeft }) {
  if (!results) return null;
  const sorted = [...results].sort((a, b) => a.placement - b.placement);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="card w-full max-w-lg bg-sub">
        <h2 className="mb-1 text-center text-2xl font-semibold text-text">race complete</h2>
        {opponentLeft && (
          <p className="mb-3 text-center text-sm text-secondary">your opponent left the race</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {sorted.map((r) => {
            const isSelf = r.userId === selfId;
            return (
              <div
                key={r.userId}
                className={`flex items-center gap-3 rounded-md px-3 py-3 ${
                  isSelf ? 'bg-accent/10' : 'bg-bg/40'
                }`}
              >
                <span
                  className={`w-10 text-lg font-bold ${
                    r.placement === 1 ? 'text-accent' : 'text-secondary'
                  }`}
                >
                  {ordinal(r.placement)}
                </span>
                <span className="flex-1 truncate font-medium">
                  {isSelf ? 'you' : r.username}
                  {r.guest && <span className="ml-1 text-xs text-secondary">(guest)</span>}
                </span>
                <span className="w-16 text-right text-text">{r.wpm} wpm</span>
                <span className="w-14 text-right text-secondary">{Math.round(r.accuracy)}%</span>
                <span
                  className={`w-12 text-right ${
                    r.pointsGained > 0
                      ? 'text-accent'
                      : r.pointsGained < 0
                        ? 'text-error'
                        : 'text-secondary'
                  }`}
                >
                  {r.guest ? '—' : `${r.pointsGained > 0 ? '+' : ''}${r.pointsGained}`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <button type="button" className="btn-primary" onClick={onRematch}>
            race again
          </button>
          <button type="button" className="btn-ghost" onClick={onExit}>
            back home
          </button>
        </div>
      </div>
    </div>
  );
}
