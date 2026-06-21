import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeWordStarts,
  measurePosition,
  computeTimedStats,
  isPrintable,
} from '../utils/typingEngine.js';
import { sound } from '../services/sound.js';

/**
 * Timed, infinite-words typing state machine. Captures keystrokes (not input
 * events) so paste/autofill are impossible. Space advances to the next word;
 * Backspace edits the current word or steps back into a still-incorrect
 * previous word (Monkeytype behaviour). The run is frozen externally via stop()
 * when the timer ends.
 *
 * @param {Object} opts
 * @param {string[]} opts.words
 * @param {boolean} opts.enabled
 */
export function useTypingEngine({ words, enabled }) {
  const [typedWords, setTypedWords] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const typedRef = useRef([]);
  const wordIndexRef = useRef(0);
  const startTimeRef = useRef(0);
  const totalKeystrokesRef = useRef(0);
  const errorKeystrokesRef = useRef(0);
  const finishedRef = useRef(false);

  const wordStarts = useMemo(() => computeWordStarts(words), [words]);

  const reset = useCallback(() => {
    typedRef.current = [];
    wordIndexRef.current = 0;
    startTimeRef.current = 0;
    totalKeystrokesRef.current = 0;
    errorKeystrokesRef.current = 0;
    finishedRef.current = false;
    setTypedWords([]);
    setWordIndex(0);
    setStarted(false);
    setFinished(false);
  }, []);

  useEffect(() => {
    reset();
  }, [words, reset]);

  // Freeze input (called by the page when the timer expires).
  const stop = useCallback(() => {
    finishedRef.current = true;
    setFinished(true);
  }, []);

  const commit = () => {
    setTypedWords([...typedRef.current]);
    setWordIndex(wordIndexRef.current);
  };

  const getStats = useCallback(() => {
    const { caretIndex, correctChars } = measurePosition(
      words,
      wordStarts,
      typedRef.current,
      wordIndexRef.current
    );
    const timed = computeTimedStats({
      correctChars,
      totalKeystrokes: totalKeystrokesRef.current,
      errorKeystrokes: errorKeystrokesRef.current,
      startTime: startTimeRef.current,
    });
    return { ...timed, caretIndex, correctChars, mistakes: countMistakes() };
  }, [words, wordStarts]);

  const countMistakes = () => {
    const wi = wordIndexRef.current;
    const tw = typedRef.current[wi] || '';
    const word = words[wi] || '';
    let m = 0;
    for (let k = 0; k < Math.min(tw.length, word.length); k += 1) if (tw[k] !== word[k]) m += 1;
    return m;
  };

  const ensureStarted = () => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      setStarted(true);
    }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled || finishedRef.current) return;
      const { key } = e;
      const typed = typedRef.current;
      const wi = wordIndexRef.current;
      if (typed[wi] == null) typed[wi] = '';

      if (key === 'Backspace') {
        e.preventDefault();
        const prevHasMistakes = wi > 0 && (typed[wi - 1] || '') !== words[wi - 1];

        if (e.ctrlKey) {
          // Ctrl+Backspace: clear the whole current word; or, if already empty,
          // step back and clear the previous word (only if it has mistakes).
          if (typed[wi].length > 0) {
            typed[wi] = '';
          } else if (prevHasMistakes) {
            wordIndexRef.current = wi - 1;
            typed[wi - 1] = '';
          } else {
            return;
          }
          sound.hit(); // backspace uses the correct-keystroke sound
          commit();
          return;
        }

        if (typed[wi].length > 0) {
          typed[wi] = typed[wi].slice(0, -1);
        } else if (prevHasMistakes) {
          // Step back into a previous word that still has mistakes. If the
          // previous word was typed perfectly, backspace is blocked entirely.
          wordIndexRef.current = wi - 1;
        } else {
          return; // nothing to do (previous word is correct, or at the start)
        }
        sound.hit();
        commit();
        return;
      }

      if (key === ' ') {
        e.preventDefault();
        // Advance only from a non-empty word and only if more words remain.
        if (typed[wi].length > 0 && wi < words.length - 1) {
          ensureStarted();
          totalKeystrokesRef.current += 1; // the space is a correct keystroke
          wordIndexRef.current = wi + 1;
          if (typed[wi + 1] == null) typed[wi + 1] = '';
          sound.hit();
          commit();
        }
        return;
      }

      if (!isPrintable(key)) return; // Shift, arrows, etc.
      e.preventDefault();

      const word = words[wi] || '';
      if (typed[wi].length >= word.length) return; // can't over-type a word

      ensureStarted();
      totalKeystrokesRef.current += 1;
      const correct = key === word[typed[wi].length];
      if (!correct) errorKeystrokesRef.current += 1;
      typed[wi] += key;
      sound[correct ? 'hit' : 'error'](); // correct -> hit, mistake -> error
      commit();
    },
    [enabled, words]
  );

  const handlePaste = useCallback((e) => e.preventDefault(), []);
  const handlers = useMemo(
    () => ({ onKeyDown: handleKeyDown, onPaste: handlePaste, onDrop: handlePaste }),
    [handleKeyDown, handlePaste]
  );

  // Local caret index for rendering (derived from current state).
  const caretIndex = (wordStarts[wordIndex] ?? 0) + (typedWords[wordIndex]?.length ?? 0);

  return {
    typedWords,
    wordIndex,
    caretIndex,
    started,
    finished,
    reset,
    stop,
    getStats,
    handlers,
  };
}
