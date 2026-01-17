import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgba(var(--background), <alpha-value>)',
        surface: 'rgba(var(--surface), <alpha-value>)',
      }
    },
  },
  plugins: [],
  darkMode: 'class'
}
export default config
