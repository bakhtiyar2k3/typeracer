// Common English words for the typing stream. Lowercase, no punctuation or
// numbers (per spec choice). Races stream the SAME generated list to both
// players so their carets share one coordinate space.

export const WORD_LIST = [
  'the', 'be', 'of', 'and', 'a', 'to', 'in', 'have', 'it', 'that', 'for', 'they',
  'with', 'as', 'not', 'on', 'she', 'at', 'by', 'this', 'we', 'you', 'do', 'but',
  'from', 'or', 'which', 'one', 'would', 'all', 'will', 'there', 'say', 'who',
  'make', 'when', 'can', 'more', 'if', 'no', 'man', 'out', 'other', 'so', 'what',
  'time', 'up', 'go', 'about', 'than', 'into', 'could', 'state', 'only', 'new',
  'year', 'some', 'take', 'come', 'these', 'know', 'see', 'use', 'get', 'like',
  'then', 'first', 'any', 'work', 'now', 'may', 'such', 'give', 'over', 'think',
  'most', 'even', 'find', 'day', 'also', 'after', 'way', 'many', 'must', 'look',
  'before', 'great', 'back', 'through', 'long', 'where', 'much', 'should', 'well',
  'people', 'down', 'own', 'just', 'because', 'good', 'each', 'those', 'feel',
  'seem', 'how', 'high', 'too', 'place', 'little', 'world', 'very', 'still',
  'hand', 'old', 'life', 'tell', 'write', 'become', 'here', 'show', 'house',
  'both', 'between', 'need', 'mean', 'call', 'under', 'last', 'right', 'move',
  'thing', 'general', 'school', 'never', 'same', 'another', 'begin', 'while',
  'number', 'part', 'turn', 'real', 'leave', 'might', 'want', 'point', 'form',
  'off', 'child', 'few', 'small', 'since', 'against', 'ask', 'late', 'home',
  'large', 'person', 'end', 'open', 'public', 'follow', 'during', 'present',
  'without', 'again', 'hold', 'around', 'possible', 'head', 'consider', 'word',
  'program', 'problem', 'however', 'lead', 'system', 'set', 'order', 'eye',
  'plan', 'run', 'keep', 'face', 'fact', 'group', 'play', 'stand', 'increase',
  'early', 'course', 'change', 'help', 'line', 'city', 'put', 'close', 'case',
  'force', 'meet', 'once', 'water', 'upon', 'war', 'build', 'hear', 'light',
  'unite', 'live', 'every', 'country', 'bring', 'center', 'let', 'side', 'try',
  'provide', 'continue', 'name', 'certain', 'power', 'pay', 'result', 'question',
  'study', 'woman', 'member', 'until', 'far', 'night', 'always', 'service',
  'away', 'report', 'something', 'company', 'week', 'toward', 'start', 'social',
  'room', 'figure', 'nature', 'though', 'young', 'less', 'enough', 'almost',
  'read', 'include', 'nothing', 'yet', 'better', 'big', 'boy', 'cost', 'business',
  'value', 'second', 'why', 'clear', 'expect', 'family', 'complete', 'act',
  'sense', 'mind', 'experience', 'art', 'next', 'near', 'direct', 'car', 'law',
  'industry', 'important', 'girl', 'several', 'matter', 'usual', 'rather', 'per',
  'often', 'kind', 'among', 'white', 'reason', 'action', 'return', 'foot', 'care',
  'simple', 'within', 'love', 'human', 'along', 'appear', 'doctor', 'believe',
  'speak', 'active', 'student', 'month', 'drive', 'concern', 'best', 'door',
  'hope', 'example', 'inform', 'body', 'ever', 'least', 'probable', 'understand',
  'reach', 'effect', 'different', 'idea', 'whole', 'control', 'condition',
  'field', 'pass', 'fall', 'note', 'special', 'talk', 'particular', 'today',
  'measure', 'walk', 'teach', 'low', 'hour', 'type', 'carry', 'rate', 'remain',
  'full', 'street', 'easy', 'although', 'record', 'sit', 'determine', 'level',
  'local', 'sure', 'receive', 'thus', 'moment', 'spirit', 'train', 'college',
];

// Deterministic PRNG so a seed yields the same stream (handy for shared races).
function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a list of random words. Avoids the same word twice in a row so the
 * stream reads naturally.
 * @param {number} count
 * @param {number} [seed]  omit for non-deterministic (solo) generation
 * @returns {string[]}
 */
export function generateWords(count, seed) {
  const rand = seed == null ? Math.random : mulberry32(seed);
  const out = [];
  let prev = -1;
  for (let i = 0; i < count; i += 1) {
    let idx = Math.floor(rand() * WORD_LIST.length);
    if (idx === prev) idx = (idx + 1) % WORD_LIST.length;
    prev = idx;
    out.push(WORD_LIST[idx]);
  }
  return out;
}
