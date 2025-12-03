/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // The "Zinc & Void" Palette
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / 0.4)', // Fixed opacity as per design
        border: 'rgb(var(--border) / 0.5)',   // Fixed opacity as per design

        // Typography
        primary: '#e4e4e7', // Zinc-200
        secondary: '#71717a', // Zinc-500
        tertiary: '#52525b', // Zinc-600
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        micro: ['10px', { letterSpacing: '0.05em', lineHeight: '1rem' }],
        base: ['12px', { lineHeight: '1.5rem' }],
        header: ['14px', { lineHeight: '1.75rem' }],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
