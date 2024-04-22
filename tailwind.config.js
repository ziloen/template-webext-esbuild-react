import containerQuries from '@tailwindcss/container-queries'
import { defineConfig, preset } from '@ziloen/tailwind-config'

export default defineConfig({
  content: ['./src/**/*.{ts,tsx,html}'],
  presets: [preset],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          '"Fira Code Variable"',
          'ui-monospace',
          '"Cascadia Code"',
          '"Source Code Pro"',
          'Menlo',
          'Consolas',
          '"DejaVu Sans Mono"',
          'monospace',
        ],
        sans: [
          '"Noto Sans SC Variable"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
    },
  },
  plugins: [containerQuries],
})
