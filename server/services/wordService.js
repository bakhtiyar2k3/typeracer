import { generateWords, WORD_LIST } from '../../shared/constants/words.js';
import { GameConfig } from '../../shared/constants/game.js';

// Generates the shared word stream for a race. The server creates it once per
// room and sends the exact array to both players so their carets share one
// coordinate space (same words, same positions).
export const wordService = {
  poolSize: () => WORD_LIST.length,
  forRace: () => generateWords(GameConfig.WORDS_PER_RACE, (Math.random() * 1e9) | 0),
};
