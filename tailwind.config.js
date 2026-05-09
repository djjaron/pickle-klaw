const { Config } = require('tailwindcss');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 300: '#818cf8', 400: '#6366f1', 500: '#4f46e5' },
      },
    },
  },
  plugins: [],
};
