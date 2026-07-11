import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#080b10',
        surface: '#111720',
        'surface-2': '#192332',
        'surface-3': '#0d1219',
        'surface-4': '#080b10',
        text: '#eee9df',
        'text-muted': '#7e8793',
        teal: '#4fd1b5',
        'teal-dim': '#20b89b',
        amber: '#e9ad57',
        'amber-dim': '#b87d1a',
      },
      fontFamily: {
        serif: ['IBM Plex Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}
export default config
