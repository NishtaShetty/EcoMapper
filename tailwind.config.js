/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 12px 30px -12px rgba(0,0,0,0.18)',
      },
      colors: {
        eco: {
          green: '#16a34a',
          blue: '#2563eb',
          orange: '#f97316',
          gray: '#111827',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
}
