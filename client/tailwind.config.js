/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Monkeytype palette (kept in sync with shared/constants/theme.js).
        bg: '#323437',
        sub: '#2c2e31',
        text: '#d1d0c5',
        accent: '#e2b714',
        secondary: '#646669',
        error: '#ca4754',
        'error-extra': '#7e2a33',
      },
      fontFamily: {
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'caret-blink': {
          '0%, 40%': { opacity: '1' },
          '70%': { opacity: '0.15' },
          '100%': { opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'caret-blink': 'caret-blink 1.1s ease-in-out infinite',
        'fade-in': 'fade-in 0.25s ease-out',
        'pop': 'pop 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
