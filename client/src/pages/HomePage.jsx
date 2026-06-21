import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateWords } from '@shared/constants/words.js';
import { GameConfig } from '@shared/constants/game.js';
import { TypingBox } from '../components/typing/TypingBox.jsx';
import { StatsBar } from '../components/typing/StatsBar.jsx';
import { SoloResultModal } from '../components/typing/SoloResultModal.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';

const makeWords = (durationSec) =>
  generateWords(Math.max(120, durationSec * GameConfig.SOLO_WORDS_PER_SECOND));

// Solo timed practice — the Monkeytype experience: infinite scrolling words,
// fixed time, pick 15 / 30 / 60s. Also the entry point into live multiplayer.
export default function HomePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [durationSec, setDurationSec] = useState(GameConfig.SOLO_DURATIONS[1]); // 30
  const [words, setWords] = useState(() => makeWords(GameConfig.SOLO_DURATIONS[1]));
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [timeUp, setTimeUp] = useState(false);
  const [stats, setStats] = useState({ wpm: 0, accuracy: 100 });
  const [summary, setSummary] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const opponents = useMemo(() => [], []);

  const onStartChange = useCallback((s) => setStarted(s), []);
  const onTick = useCallback((s) => setStats(s), []);

  // Run the countdown once typing begins.
  useEffect(() => {
    if (!started) return undefined;
    const startAt = Date.now();
    let done = false;
    let id;
    const tick = () => {
      if (done) return;
      const left = durationSec - (Date.now() - startAt) / 1000;
      if (left <= 0) {
        done = true;
        clearInterval(id);
        setTimeLeft(0);
        setTimeUp(true);
        setSummary(statsRef.current);
        setShowResult(true);
      } else {
        setTimeLeft(left);
      }
    };
    id = setInterval(tick, 100);
    tick();
    return () => clearInterval(id);
  }, [started, durationSec]);

  const restart = useCallback(
    (nextDuration = durationSec) => {
      setDurationSec(nextDuration);
      setWords(makeWords(nextDuration));
      setStarted(false);
      setTimeUp(false);
      setTimeLeft(nextDuration);
      setStats({ wpm: 0, accuracy: 100 });
      setSummary(null);
      setShowResult(false);
    },
    [durationSec]
  );

  return (
    <div className="flex flex-1 flex-col justify-center gap-10 py-6">
      {/* Time selector */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="mr-2 text-secondary">time</span>
        {GameConfig.SOLO_DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => restart(d)}
            className={`rounded px-3 py-1 transition-colors ${
              d === durationSec ? 'text-accent' : 'text-secondary hover:text-text'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-8">
        <TypingBox
          key={`${durationSec}-${words[0]}-${words.length}`}
          words={words}
          enabled={!timeUp}
          opponents={opponents}
          tickMs={120}
          onTick={onTick}
          onStartChange={onStartChange}
          onRestart={() => restart()}
        />

        <StatsBar
          timeLeft={summary ? 0 : timeLeft}
          wpm={summary ? summary.wpm : stats.wpm}
          accuracy={summary ? summary.accuracy : stats.accuracy}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" className="btn-ghost" onClick={() => restart()}>
            ↻ new test
          </button>
          {summary && (
            <span className="text-sm text-secondary animate-fade-in">
              {summary.wpm} wpm · {Math.round(summary.accuracy)}% acc · {durationSec}s
            </span>
          )}
        </div>

        {isMobile ? (
          <span className="text-sm text-secondary">ranked multiplayer is disabled on mobile</span>
        ) : (
          <button type="button" className="btn-primary" onClick={() => navigate('/race')}>
            find match →
          </button>
        )}
      </div>

      {showResult && (
        <SoloResultModal
          result={summary}
          durationSec={durationSec}
          onNext={() => restart()}
          onClose={() => setShowResult(false)}
        />
      )}
    </div>
  );
}
