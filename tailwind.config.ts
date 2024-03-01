import { pluginCreator } from '@ziloen/tailwind-config'
import type { Config } from 'tailwindcss'
import { } from 'tailwindcss/defaultConfig'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    colors: {
      // Default colors
      inherit: 'inherit',
      current: 'currentColor',
      transparent: 'transparent',
      black: '#000',
      white: '#fff',
    },

    lineHeight: {
      none: '1',
    },

    zIndex: {
      auto: 'auto',
      0: '0',
      1: '1',
      2: '2',
      3: '3',
      max: '2147483647',
    },

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
  experimental: {
    // Remove unused global css variables, e.g. --tw-translate-x: 0;
    optimizeUniversalDefaults: true,
    // matchVariant: true,
  },
  // https://tailwindcss.com/docs/theme#configuration-reference
  // https://github.com/tailwindlabs/tailwindcss/blob/master/src/corePlugins.js
  corePlugins: {},
  plugins: [pluginCreator],
} satisfies Config
