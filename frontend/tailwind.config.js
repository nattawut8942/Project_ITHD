import colors from 'tailwindcss/colors.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#0f172a',
          soft: '#121b2f',
          deep: '#0b1120',
        },
        paper: '#f3f4f6',
        surface: '#ffffff',
        ink: '#1d4ed8',
        'ink-soft': '#334155',
        muted: '#5b6779',
        line: '#dde3ec',
        // Brand value is DEFAULT (bg-teal, text-amber, ...). Spreading the default
        // scale keeps classes like text-teal-800 / bg-amber-50 / text-rose-800 working,
        // which status badges and device badges depend on.
        teal: { DEFAULT: '#0f766e', ...colors.teal },
        amber: { DEFAULT: '#e0a100', ...colors.amber },
        rose: { DEFAULT: '#b42318', ...colors.rose },
      },
      fontFamily: {
        sans: ['Prompt', 'sans-serif'],
        display: ['Prompt', 'sans-serif'],
        body: ['Prompt', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20, 33, 61, 0.04), 0 6px 18px -10px rgba(20, 33, 61, 0.14)',
        lift: '0 2px 4px rgba(20, 33, 61, 0.05), 0 16px 32px -14px rgba(20, 33, 61, 0.22)',
      },
      keyframes: {
        'modal-pop': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(15px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'fade': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'modal-pop': 'modal-pop 0.4s ease-out forwards',
        'fade': 'fade 0.4s ease-out forwards',
      }
    },
  },
  plugins: [],
}
