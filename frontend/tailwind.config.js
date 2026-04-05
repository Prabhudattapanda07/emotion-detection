/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink:    '#07090f',
        panel:  '#0e1320',
        card:   '#141b2d',
        border: '#1e2a42',
        accent: '#00d4ff',
        teal:   '#00b4a0',
        rose:   '#ff4d6d',
        amber:  '#ffb547',
        muted:  '#4a5568',
        dim:    '#8899aa',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0,212,255,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0,212,255,0.7), 0 0 40px rgba(0,212,255,0.3)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
