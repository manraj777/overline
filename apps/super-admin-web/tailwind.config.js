/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4648d4', 50: '#eef2ff', 100: '#e0e7ff', 500: '#4648d4', 600: '#3730a3', 700: '#312e81' },
        surface: { DEFAULT: '#f8f9ff', dark: '#111827' },
      },
    },
  },
  plugins: [],
};
