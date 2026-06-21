// A compact "race track" showing every player's progress and live WPM. The
// self row is highlighted. Updates at ~10fps which is plenty for the bars.
export function ProgressTrack({ rows }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.userId} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-sm">
            <span style={{ color: r.color }}>{r.isSelf ? 'you' : r.username}</span>
          </div>
          <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/25">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{ width: `${Math.round((r.progress || 0) * 100)}%`, backgroundColor: r.color }}
            />
          </div>
          <div className="w-20 shrink-0 text-right text-sm text-secondary">
            {r.finished ? <span className="text-accent">done</span> : `${Math.round(r.wpm || 0)} wpm`}
          </div>
        </div>
      ))}
    </div>
  );
}
