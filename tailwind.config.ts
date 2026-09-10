import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#08060f',
          800: '#0d0a1a',
          700: '#141026',
          600: '#1c1633',
          500: '#282046',
          400: '#3a2f63',
        },
        neon: {
          violet: '#a855f7',
          fuchsia: '#e879f9',
          cyan: '#22d3ee',
          lime: '#a3e635',
          amber: '#fbbf24',
          rose: '#fb7185',
          sky: '#38bdf8',
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(168,85,247,.35), 0 0 24px -4px rgba(168,85,247,.45)',
        'glow-cyan': '0 0 0 1px rgba(34,211,238,.35), 0 0 24px -4px rgba(34,211,238,.45)',
      },
      keyframes: {
        'grid-drift': {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(0,-64px,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(168,85,247,.55)' },
          '70%': { boxShadow: '0 0 0 12px rgba(168,85,247,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(168,85,247,0)' },
        },
      },
      animation: {
        'grid-drift': 'grid-drift 14s linear infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
