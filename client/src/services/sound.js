// Low-latency keystroke sounds via the Web Audio API.
//
// Why Web Audio (not `new Audio()` per keypress): each clip is decoded ONCE
// into an AudioBuffer, then every play spins up a throwaway BufferSourceNode —
// microsecond-cheap, overlap-safe, and zero per-keystroke network/allocation
// cost. This keeps fast typing perfectly smooth.

const FILES = {
  hit: '/sounds/keyHit.mp3',
  error: '/sounds/keyError.mp3',
};
const STORAGE_KEY = 'typeracer-sound';
const VOLUME = 0.45; // comfortable level for rapid typing

let ctx = null;
let gain = null;
const buffers = {}; // name -> AudioBuffer
let loadPromise = null;
let enabled = readPref();

function readPref() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'; // default ON
  } catch {
    return true;
  }
}

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  gain = ctx.createGain();
  gain.gain.value = VOLUME;
  gain.connect(ctx.destination);
  return ctx;
}

// Fetch + decode both clips once. Safe to call eagerly: decoding works while
// the context is suspended (before any user gesture).
function preload() {
  if (loadPromise) return loadPromise;
  const c = ensureCtx();
  if (!c) return Promise.resolve();
  loadPromise = Promise.all(
    Object.entries(FILES).map(async ([name, url]) => {
      try {
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        buffers[name] = await c.decodeAudioData(data);
      } catch {
        /* missing/undecodable asset — sound just stays silent */
      }
    })
  );
  return loadPromise;
}

function play(name) {
  if (!enabled || !ctx || !buffers[name]) return;
  // The first keystroke is a user gesture — resume a suspended context here.
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buffers[name];
  src.connect(gain);
  src.start(0);
}

export const sound = {
  preload,
  hit: () => play('hit'),
  error: () => play('error'),
  isEnabled: () => enabled,
  setEnabled(value) {
    enabled = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (value) {
      ensureCtx();
      preload();
      if (ctx?.state === 'suspended') ctx.resume();
    }
  },
};
