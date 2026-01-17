<<<<<<< HEAD
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
=======
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
>>>>>>> 777f5652ff0fc39e3c735fed33f0d45efaded27a
  ],
  theme: {
    extend: {
      colors: {
<<<<<<< HEAD
        'glass-bg': 'rgba(255, 255, 255, 0.1)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',
        'dark-bg': '#1a1b26',
        'sidebar-bg': 'rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        'xs': '2px',
=======
        background: 'rgba(var(--background), <alpha-value>)',
        surface: 'rgba(var(--surface), <alpha-value>)',
>>>>>>> 777f5652ff0fc39e3c735fed33f0d45efaded27a
      }
    },
  },
  plugins: [],
<<<<<<< HEAD
  darkMode: 'class', // Enable class-based dark mode
}
=======
  darkMode: 'class'
}
export default config
>>>>>>> 777f5652ff0fc39e3c735fed33f0d45efaded27a
