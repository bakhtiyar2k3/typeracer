// Pure helpers for the timed, infinite-words typing model. No React here.

const MS_PER_MIN = 60000;

/** Canonical start index of every word in `words.join(' ')`. */
export function computeWordStarts(words) {
  const starts = new Array(words.length);
  let acc = 0;
  for (let i = 0; i < words.length; i += 1) {
    starts[i] = acc;
    acc += words[i].length + 1; // +1 for the separating space
  }
  return starts;
}

/**
 * Caret position (canonical char index) and count of correctly typed characters
 * (letters + the spaces between completed words — matching how WPM counts).
 */
export function measurePosition(words, wordStarts, typedWords, wordIndex) {
  let correctChars = 0;
  for (let w = 0; w < wordIndex && w < words.length; w += 1) {
    const tw = typedWords[w] || '';
    const word = words[w];
    const n = Math.min(tw.length, word.length);
    for (let k = 0; k < n; k += 1) if (tw[k] === word[k]) correctChars += 1;
    correctChars += 1; // the space you pressed to advance
  }
  const curTyped = typedWords[wordIndex] || '';
  const curWord = words[wordIndex] || '';
  const n = Math.min(curTyped.length, curWord.length);
  for (let k = 0; k < n; k += 1) if (curTyped[k] === curWord[k]) correctChars += 1;

  const caretIndex = (wordStarts[wordIndex] ?? 0) + curTyped.length;
  return { caretIndex, correctChars };
}

/**
 * Live stats for a timed run.
 * - wpm: net words per minute (correct chars / 5 / minutes elapsed)
 * - accuracy: cumulative correct keystrokes / total keystrokes (sticky errors)
 */
export function computeTimedStats({
  correctChars,
  totalKeystrokes,
  errorKeystrokes,
  startTime,
  now = Date.now(),
}) {
  const elapsedMs = startTime ? Math.max(now - startTime, 1) : 0;
  const minutes = elapsedMs / MS_PER_MIN;
  const wpm = minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0;
  const accuracy =
    totalKeystrokes > 0
      ? Math.round(((totalKeystrokes - errorKeystrokes) / totalKeystrokes) * 1000) / 10
      : 100;
  return {
    wpm: Math.max(0, wpm),
    accuracy: Math.max(0, Math.min(100, accuracy)),
    elapsedMs,
  };
}

// Printable single character (letters, digits, space, punctuation). Modifier
// and navigation keys ("Shift", "Enter", "ArrowLeft", ...) have length > 1.
export function isPrintable(key) {
  return key.length === 1;
}
