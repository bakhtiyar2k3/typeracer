import { Stat } from '../ui/Stat.jsx';

// Live HUD for timed runs: a prominent countdown plus WPM and accuracy. Kept
// tiny and isolated from the word grid (which is memoized) to avoid re-renders.
export function StatsBar({ timeLeft = 0, wpm = 0, accuracy = 100 }) {
  return (
    <div className="flex items-end gap-10">
      <Stat label="time" value={`${Math.ceil(timeLeft)}s`} accent />
      <Stat label="wpm" value={wpm} />
      <Stat label="acc" value={`${Math.round(accuracy)}%`} />
    </div>
  );
}
