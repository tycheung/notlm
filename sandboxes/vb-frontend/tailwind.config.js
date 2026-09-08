/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        ui: [
          'JetBrains Mono',
          'SF Mono',
          'Fira Code',
          'monospace',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Fira Code',
          'monospace',
        ],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        prose: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        /*
         * Primary orange is for accents and fills — not default button text on orange.
         * Use text-text / text-text-muted on surfaces; text-white on bg-primary (see Button).
         */
        // Mobile app color palette (C object)
        bg: '#0a0e17',
        surface: '#111827',
        'surface-light': '#1e293b',
        border: '#334155',
        primary: '#f97316',
        'primary-light': '#fb923c',
        accent: '#06b6d4',
        danger: '#ef4444',
        'danger-dark': '#dc2626',
        success: '#22c55e',
        text: '#f1f5f9',
        'text-muted': '#94a3b8',
        'text-dim': '#64748b',
        pending: '#fbbf24',
        split: '#ef4444',
        strike: '#f97316',
        spare: '#06b6d4',
      },
      borderRadius: {
        'btn': '8px',
        'btn-sm': '6px',
        'card': '12px',
        'input': '8px',
      },
      spacing: {
        'field': '14px',
        'card': '10px 14px',
        'card-header': '12px 14px',
      },
      fontSize: {
        // Responsive font sizes - mobile first, scales up for desktop
        'xs-responsive': ['0.6875rem', { lineHeight: '1.5', letterSpacing: '0.06em' }], // 11px mobile, scales
        'sm-responsive': ['0.8125rem', { lineHeight: '1.5' }], // 13px mobile, scales
        'base-responsive': ['1rem', { lineHeight: '1.5' }], // 16px mobile, scales
        'lg-responsive': ['1.125rem', { lineHeight: '1.4' }], // 18px mobile, scales
        'xl-responsive': ['1.25rem', { lineHeight: '1.3' }], // 20px mobile, scales
        // Mobile app specific sizes (for scorecards, etc.)
        'xs-mobile': ['0.6875rem', { lineHeight: '1.4' }], // 11px fixed
        'sm-mobile': ['0.8125rem', { lineHeight: '1.5' }], // 13px fixed
      }
    },
  },
  plugins: [],
} 