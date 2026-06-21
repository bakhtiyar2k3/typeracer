import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme } from '@shared/constants/theme.js';
import { useRace } from '../hooks/useRace.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { TypingBox } from '../components/typing/TypingBox.jsx';
import { StatsBar } from '../components/typing/StatsBar.jsx';
import { Countdown } from '../components/race/Countdown.jsx';
import { ProgressTrack } from '../components/race/ProgressTrack.jsx';
import { ResultsModal } from '../components/race/ResultsModal.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';

export default function RacePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const race = useRace();
  const {
    phase,
    roomId,
    words,
    duration,
    opponents,
    selfPlayer,
    countdown,
    results,
    liveOpponents,
    raceStartedAt,
    opponentLeft,
    error,
    positionsRef,
    selfId,
    joinQueue,
    leaveQueue,
    sendTypingUpdate,
    reset,
  } = race;

  const [selfStats, setSelfStats] = useState({ wpm: 0, accuracy: 100, correctChars: 0, caretIndex: 0 });
  const [timeLeft, setTimeLeft] = useState(duration / 1000);
  const [timeUp, setTimeUp] = useState(false);
  const joinedRef = useRef(false);
  const statsRef = useRef(selfStats);
  statsRef.current = selfStats;

  // Auto-join on entry (the user clicked "find match").
  useEffect(() => {
    if (isMobile || joinedRef.current) return;
    joinedRef.current = true;
    joinQueue();
  }, [isMobile, joinQueue]);

  // Countdown timer for the fixed-duration race.
  useEffect(() => {
    if (phase !== 'racing' || !raceStartedAt) return undefined;
    setTimeUp(false);
    const tick = () => {
      const left = Math.max(0, (raceStartedAt + duration - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) setTimeUp(true);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phase, raceStartedAt, duration]);

  // On time-up, push one final stats snapshot so the server's result is current.
  useEffect(() => {
    if (timeUp) sendTypingUpdate(statsRef.current);
  }, [timeUp, sendTypingUpdate]);

  const onTick = useCallback(
    (s) => {
      setSelfStats(s);
      sendTypingUpdate(s);
    },
    [sendTypingUpdate]
  );

  const opponentDescriptors = useMemo(
    () => opponents.map((o) => ({ id: o.userId, color: o.caretColor, username: o.username })),
    [opponents]
  );

  const trackRows = useMemo(() => {
    const oppCorrects = opponents.map((o) => liveOpponents[o.userId]?.correctChars || 0);
    const maxCorrect = Math.max(1, selfStats.correctChars, ...oppCorrects);
    const self = {
      userId: selfId,
      username: 'you',
      color: selfPlayer?.caretColor || Theme.accent,
      isSelf: true,
      progress: selfStats.correctChars / maxCorrect,
      wpm: selfStats.wpm,
    };
    const others = opponents.map((o) => ({
      userId: o.userId,
      username: o.username,
      color: o.caretColor,
      isSelf: false,
      progress: (liveOpponents[o.userId]?.correctChars || 0) / maxCorrect,
      wpm: liveOpponents[o.userId]?.wpm || 0,
    }));
    return [self, ...others];
  }, [selfId, selfPlayer, opponents, selfStats, liveOpponents]);

  const handleRematch = useCallback(() => {
    setSelfStats({ wpm: 0, accuracy: 100, correctChars: 0, caretIndex: 0 });
    setTimeUp(false);
    setTimeLeft(duration / 1000);
    reset();
    joinQueue();
  }, [reset, joinQueue, duration]);

  const handleExit = useCallback(() => {
    leaveQueue();
    navigate('/');
  }, [leaveQueue, navigate]);

  if (isMobile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-secondary">Ranked multiplayer is disabled on mobile for now.</p>
        <button type="button" className="btn-primary" onClick={() => navigate('/')}>
          back to practice
        </button>
      </div>
    );
  }

  // --- Searching / queue ------------------------------------------------------
  if (phase === 'idle' || phase === 'queuing') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Spinner className="h-8 w-8" />
        <div>
          <p className="text-lg text-text">finding an opponent…</p>
          <p className="mt-1 text-sm text-secondary">matching you with another racer</p>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <button type="button" className="btn-ghost" onClick={handleExit}>
          cancel
        </button>
      </div>
    );
  }

  // --- Opponent left (aborted, no result) -------------------------------------
  if (phase === 'aborted') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <p className="text-lg text-text">your opponent left the race</p>
        <p className="text-sm text-secondary">no result was recorded</p>
        <div className="flex gap-3">
          <button type="button" className="btn-primary" onClick={handleRematch}>
            find new match
          </button>
          <button type="button" className="btn-ghost" onClick={handleExit}>
            back home
          </button>
        </div>
      </div>
    );
  }

  const racing = phase === 'racing';
  const inCountdown = phase === 'matched' || phase === 'countdown';

  return (
    <div className="flex flex-1 flex-col gap-8 py-6">
      <ProgressTrack rows={trackRows} />

      <div className="relative rounded-lg bg-sub/40 p-6">
        {inCountdown && countdown && <Countdown value={countdown.value} go={countdown.go} />}

        {(racing || phase === 'finished') && words.length > 0 && (
          <TypingBox
            key={roomId}
            words={words}
            enabled={racing && !timeUp}
            selfColor={selfPlayer?.caretColor || Theme.accent}
            selfLabel="you"
            opponents={opponentDescriptors}
            positionsRef={positionsRef}
            tickMs={40}
            onTick={onTick}
          />
        )}

        {inCountdown && (
          <p className="mt-6 text-center text-sm text-secondary">
            same words for both racers — most words in {Math.round(duration / 1000)}s wins
          </p>
        )}
      </div>

      {racing && (
        <StatsBar timeLeft={timeLeft} wpm={selfStats.wpm} accuracy={selfStats.accuracy} />
      )}

      {timeUp && phase !== 'finished' && (
        <p className="text-center text-sm text-secondary animate-fade-in">
          time&apos;s up! finalizing results…
        </p>
      )}

      {phase === 'finished' && (
        <ResultsModal
          results={results}
          selfId={selfId}
          opponentLeft={opponentLeft}
          onRematch={handleRematch}
          onExit={handleExit}
        />
      )}
    </div>
  );
}
