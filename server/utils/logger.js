// Tiny structured logger. Avoids a dependency while keeping output consistent.
function stamp() {
  return new Date().toISOString();
}

export const logger = {
  info: (...args) => console.log(`[${stamp()}] [info]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}] [warn]`, ...args),
  error: (...args) => console.error(`[${stamp()}] [error]`, ...args),
  debug: (...args) => {
    if (process.env.DEBUG) console.debug(`[${stamp()}] [debug]`, ...args);
  },
};
