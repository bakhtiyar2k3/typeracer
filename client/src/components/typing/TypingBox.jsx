import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Theme } from '@shared/constants/theme.js';
import { useTypingEngine } from '../../hooks/useTypingEngine.js';
import { TypingText } from './TypingText.jsx';

/**
 * Focusable typing surface for the timed, infinite-words mode.
 *
 * @param {Object} props
 * @param {string[]} props.words
 * @param {boolean} props.enabled
 * @param {string} [props.selfColor]
 * @param {string|null} [props.selfLabel]            caret label for the local player ("you" in races, none in solo)
 * @param {{id:string,color:string,username?:string}[]} [props.opponents]
 * @param {{current: Record<string, number>}} [props.positionsRef]
 * @param {number} [props.tickMs]
 * @param {(stats:any)=>void} [props.onTick]
 * @param {(started:boolean)=>void} [props.onStartChange]
 * @param {() => void} [props.onRestart]             Tab restarts (solo only)
 */
function TypingBoxBase({
  words,
  enabled,
  selfColor = Theme.accent,
  selfLabel = null,
  opponents = [],
  positionsRef,
  tickMs = 100,
  onTick,
  onStartChange,
  onRestart,
}) {
  const { typedWords, wordIndex, caretIndex, started, getStats, handlers } = useTypingEngine({
    words,
    enabled,
  });

  const [focused, setFocused] = useState(false);
  const boxRef = useRef(null);

  const carets = useMemo(
    () => [
      { id: 'self', color: selfColor, label: selfLabel, isSelf: true },
      ...opponents.map((o) => ({ id: o.id, color: o.color, label: o.username || 'opponent' })),
    ],
    [selfColor, selfLabel, opponents]
  );

  const focus = useCallback(() => boxRef.current?.focus(), []);
  useEffect(() => {
    if (enabled) focus();
  }, [enabled, focus]);

  // Tab restarts the test in solo mode (where onRestart is provided). The
  // browser default (focus change) is suppressed so Tab stays in the test.
  const onRestartRef = useRef(onRestart);
  onRestartRef.current = onRestart;
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Tab' && onRestartRef.current) {
        e.preventDefault();
        onRestartRef.current();
        return;
      }
      handlers.onKeyDown(e);
    },
    [handlers]
  );

  const onStartRef = useRef(onStartChange);
  onStartRef.current = onStartChange;
  useEffect(() => {
    onStartRef.current?.(started);
  }, [started]);

  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  useEffect(() => {
    if (!started || !enabled) return undefined;
    onTickRef.current?.(getStats());
    const id = setInterval(() => onTickRef.current?.(getStats()), tickMs);
    return () => clearInterval(id);
  }, [started, enabled, tickMs, getStats]);

  return (
    <div className="relative">
      <div
        ref={boxRef}
        tabIndex={0}
        role="textbox"
        aria-label="Typing area"
        className={`outline-none transition ${focused ? '' : 'blur-[3px] opacity-60'}`}
        onKeyDown={handleKeyDown}
        onPaste={handlers.onPaste}
        onDrop={handlers.onDrop}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <TypingText
          words={words}
          typedWords={typedWords}
          wordIndex={wordIndex}
          caretIndex={caretIndex}
          carets={carets}
          positionsRef={positionsRef}
          focused={focused}
        />
      </div>

      {!focused && (
        <button
          type="button"
          onClick={focus}
          className="absolute inset-0 flex items-center justify-center text-secondary hover:text-text"
        >
          click here or press any key to focus
        </button>
      )}
    </div>
  );
}

export const TypingBox = memo(TypingBoxBase);
