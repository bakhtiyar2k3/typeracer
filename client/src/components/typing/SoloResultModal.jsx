import { Stat } from '../ui/Stat.jsx';

// Small popup shown when a solo timed test ends.
export function SoloResultModal({ result, durationSec, onNext, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="card w-full max-w-sm bg-sub text-center">
        <h2 className="mb-6 text-xl font-semibold text-text">test complete</h2>

        <div className="flex items-end justify-center gap-8">
          <Stat label="wpm" value={result.wpm} accent className="items-center" />
          <Stat label="acc" value={`${Math.round(result.accuracy)}%`} className="items-center" />
          <Stat label="time" value={`${durationSec}s`} className="items-center" />
        </div>

        <div className="mt-7 flex justify-center gap-3">
          <button type="button" className="btn-primary" onClick={onNext}>
            next test
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            close
          </button>
        </div>
        <p className="mt-4 text-xs text-secondary">press tab to restart anytime</p>
      </div>
    </div>
  );
}
