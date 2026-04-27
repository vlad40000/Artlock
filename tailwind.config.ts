import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'tls-amber':    '#fbbf24',
        'tls-amber-soft': 'rgba(251, 191, 36, 0.18)',
        'tls-emerald':  '#34d399',
        'tls-sky':      '#38bdf8',
        'tls-artboard': '#e8dfcf',
        'tls-artboard-frame': '#15120d',
      },
      backgroundColor: {
        'tls-panel':       'rgba(0, 0, 0, 0.45)',
        'tls-panel-heavy': 'rgba(0, 0, 0, 0.72)',
        'tls-bg':          '#080807',
      },
      borderColor: {
        'tls-border':      'rgba(255, 255, 255, 0.10)',
        'tls-border-soft': 'rgba(255, 255, 255, 0.06)',
      },
      textColor: {
        'tls-text':  'rgba(255, 255, 255, 0.92)',
        'tls-muted': 'rgba(255, 255, 255, 0.56)',
        'tls-faint': 'rgba(255, 255, 255, 0.34)',
        'tls-amber': '#fbbf24',
        'tls-emerald': '#34d399',
      },
      backgroundImage: {
        'tls-grid': `
          linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
        `,
      },
      backdropBlur: {
        'tls-28': '28px',
      },
      borderRadius: {
        'tls-28': '28px',
        'tls-16': '16px',
        'tls-34': '34px',
      },
      boxShadow: {
        'tls-panel':    '0 18px 60px rgba(0,0,0,0.45)',
        'tls-artboard': '0 48px 160px rgba(0,0,0,0.72)',
      },
      keyframes: {
        'tls-slide-down': {
          '0%': { opacity: '0', transform: 'translate(-50%, -10px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'tls-slide-down': 'tls-slide-down 0.4s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
