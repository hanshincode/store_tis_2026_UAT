/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TIS Brand Colors
        tis: {
          red:     '#D71920',
          'red-dark': '#b01418',
          'red-light': '#f54950',
          dark:    '#1a1a2e',
          navy:    '#16213e',
          gray:    '#6c757d',
          light:   '#f8f9fa',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        'tis-card': '0 4px 24px rgba(0,0,0,0.08)',
        'tis-nav':  '0 2px 20px rgba(0,0,0,0.1)',
      },
      backgroundImage: {
        'tis-gradient': 'linear-gradient(135deg, #D71920 0%, #b01418 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
