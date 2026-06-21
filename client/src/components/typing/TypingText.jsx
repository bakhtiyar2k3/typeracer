import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const LINE_HEIGHT_REM = 2.75;
const VISIBLE_LINES = 3;

// One word. Memoized so that while typing, only the ACTIVE word re-renders —
// every other word's props are unchanged and React skips it (minimal rerenders).
const Word = memo(function Word({ word, typed, status, startIndex, registerLetter }) {
  return (
    <span className="inline-block">
      {[...word].map((ch, k) => {
        const idx = startIndex + k;
        let cls = 'text-secondary'; // pending / future
        if (status !== 'pending') {
          if (k < typed.length) cls = typed[k] === ch ? 'text-text' : 'text-error';
          else if (status === 'done') cls = 'text-error'; // skipped (spaced early)
        }
        return (
          <span key={k} data-index={idx} ref={(el) => registerLetter(idx, el)} className={cls}>
            {ch}
          </span>
        );
      })}
    </span>
  );
});

/**
 * Scrolling, timed typing view. Renders an infinite-feeling word stream inside
 * a fixed 3-line window that scrolls up smoothly as you advance. Draws one or
 * more carets (a solid line plus an optional "cloud" label) that move smoothly
 * between characters; opponent positions come from a ref so they never re-render
 * React. A one-line top pad keeps the active line off the clip edge so the line
 * caret and its label are never cut off.
 *
 * @param {Object} props
 * @param {string[]} props.words
 * @param {string[]} props.typedWords
 * @param {number} props.wordIndex
 * @param {number} props.caretIndex                local caret (canonical char index)
 * @param {{id:string,color:string,label?:string,isSelf?:boolean}[]} props.carets
 * @param {{current: Record<string, number>}} [props.positionsRef]
 * @param {boolean} [props.focused]
 */
function TypingTextBase({ words, typedWords, wordIndex, caretIndex, carets, positionsRef, focused = true }) {
  const containerRef = useRef(null);
  const letterEls = useRef([]);
  const caretNodes = useRef(new Map());
  const caretsRef = useRef(carets);
  caretsRef.current = carets;
  const caretIndexRef = useRef(caretIndex);
  caretIndexRef.current = caretIndex;

  const [scrollY, setScrollY] = useState(0);

  const wordStarts = useMemo(() => {
    const starts = new Array(words.length);
    let acc = 0;
    for (let i = 0; i < words.length; i += 1) {
      starts[i] = acc;
      acc += words[i].length + 1;
    }
    return starts;
  }, [words]);

  const registerLetter = useCallback((idx, el) => {
    letterEls.current[idx] = el;
  }, []);

  // Pixel position of the caret sitting *before* a canonical char index.
  const measure = (index) => {
    let el = letterEls.current[index];
    let atRight = false;
    if (!el) {
      el = letterEls.current[index - 1]; // caret at end of a word / on a space
      atRight = true;
    }
    if (!el) return null;
    return {
      x: el.offsetLeft + (atRight ? el.offsetWidth : 0),
      y: el.offsetTop,
      h: el.offsetHeight || 34,
    };
  };

  // Smoothly position every caret each frame (lerp = no teleport, no jitter).
  useEffect(() => {
    let raf;
    const SELF_LERP = 0.4;
    const OPP_LERP = 0.25;
    const tick = () => {
      const positions = positionsRef?.current || {};
      for (const caret of caretsRef.current) {
        const node = caretNodes.current.get(caret.id);
        if (!node || !node.el) continue;
        const targetIndex = caret.isSelf ? caretIndexRef.current : positions[caret.id];
        const target = targetIndex == null ? null : measure(targetIndex);
        if (!target) {
          node.el.style.display = 'none';
          if (node.label) node.label.style.display = 'none';
          continue;
        }
        node.el.style.display = '';
        if (node.label) node.label.style.display = '';

        const lerp = caret.isSelf ? SELF_LERP : OPP_LERP;
        if (node.x == null) {
          node.x = target.x;
          node.y = target.y;
        } else {
          node.x += (target.x - node.x) * lerp;
          node.y += (target.y - node.y) * lerp;
        }
        node.el.style.height = `${target.h}px`;
        node.el.style.transform = `translate(${node.x}px, ${node.y}px)`;
        if (node.label) node.label.style.transform = `translate(${node.x}px, ${node.y - 20}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, positionsRef]);

  // Keep the active word's line as the second visible row (one line of history
  // above it), scrolling earlier lines up and out — smooth via CSS transition.
  useLayoutEffect(() => {
    const anchor = letterEls.current[wordStarts[wordIndex]] || letterEls.current[caretIndex];
    if (!anchor) return;
    const oneLine = containerRef.current ? containerRef.current.clientHeight / VISIBLE_LINES : 0;
    setScrollY(Math.max(0, anchor.offsetTop - oneLine));
  }, [caretIndex, wordIndex, wordStarts, words]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden"
      style={{ height: `${LINE_HEIGHT_REM * VISIBLE_LINES}rem` }}
    >
      <div
        className="relative text-3xl transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${-scrollY}px)`,
          lineHeight: `${LINE_HEIGHT_REM}rem`,
          paddingTop: `${LINE_HEIGHT_REM}rem`, // breathing room so line 1 isn't clipped
        }}
      >
        {/* Caret layer */}
        {carets.map((caret) => (
          <span key={caret.id} className="pointer-events-none">
            {caret.label ? (
              <span
                ref={(el) => registerLabel(caretNodes, caret.id, el)}
                className="absolute left-0 top-0 z-20 select-none whitespace-nowrap rounded-md
                           px-1.5 py-0.5 text-[11px] font-semibold leading-none text-bg shadow"
                style={{ backgroundColor: caret.color, display: 'none' }}
              >
                {caret.label}
              </span>
            ) : null}
            <span
              data-caret={caret.isSelf ? 'self' : caret.id}
              ref={(el) => registerCaret(caretNodes, caret.id, el)}
              className={`absolute left-0 top-0 z-10 w-[2px] ${
                caret.isSelf && focused ? 'animate-caret-blink' : ''
              }`}
              style={{ backgroundColor: caret.color, display: 'none' }}
            />
          </span>
        ))}

        {/* Word stream */}
        {words.map((w, i) => (
          <span key={i}>
            <Word
              word={w}
              typed={typedWords[i] ?? ''}
              status={i < wordIndex ? 'done' : i === wordIndex ? 'active' : 'pending'}
              startIndex={wordStarts[i]}
              registerLetter={registerLetter}
            />
            {' '}
          </span>
        ))}
      </div>
    </div>
  );
}

function registerCaret(store, id, el) {
  const existing = store.current.get(id) || {};
  store.current.set(id, { ...existing, el });
}
function registerLabel(store, id, el) {
  const existing = store.current.get(id) || {};
  store.current.set(id, { ...existing, label: el });
}

export const TypingText = memo(TypingTextBase);
