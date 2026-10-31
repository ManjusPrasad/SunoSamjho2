/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gnaniFlow: {
          canvas: 'var(--gf-canvas)',
          surface: 'var(--gf-surface)',
          surfaceMuted: 'var(--gf-surface-muted)',
          ink: 'var(--gf-ink)',
          inkMuted: 'var(--gf-ink-muted)',
          border: 'var(--gf-border)',
          brand: 'var(--gf-brand)',
          brandContrast: 'var(--gf-brand-contrast)',
          signal: 'var(--gf-signal)',
          positive: 'var(--gf-positive)',
          warning: 'var(--gf-warning)',
          danger: 'var(--gf-danger)',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        mono: ['Open Sans', 'sans-serif'],
        serif: ['Open Sans', 'sans-serif'],
      },
      borderRadius: {
        compact: '6px',
        panel: '10px',
        sheet: '16px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
      },
    },
  },
  plugins: [],
};
