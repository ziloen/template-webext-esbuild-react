import url from '@rollup/plugin-url'
import { defineConfig } from 'rolldown'
import { isDev, isFirefoxEnv, r } from './scripts/utils.js'

/**
 * @import { RolldownOptions } from "rolldown"
 */

const outdir = r('dist')

/**
 * @type {RolldownOptions}
 */
const sharedOptions = {
  outdir,
  resolve: {
    alias: {
      '~': r('src'),
      '~ext-root': isFirefoxEnv
        ? 'moz-extension://__MSG_@@extension_id__'
        : 'chrome-extension://__MSG_@@extension_id__',
    },
  },
  external: [
    'chrome-extension://__MSG_@@extension_id__/*',
    'moz-extension://__MSG_@@extension_id__/*',
  ],
  plugins: [
    url({
      include: ['**/*.woff', '**/*.woff2'],
      limit: 0,
      emitFiles: true,
      destDir: r('dist/assets'),
      fileName: '[hash][extname]',
    }),
  ],
}

export default defineConfig([
  {
    ...sharedOptions,
    input: {
      'content-script/main': r('src/content-scripts/main.ts'),
    },
    output: {
      format: 'iife',
    },
  },
  {
    ...sharedOptions,
    input: {
      'background/main': r('src/background/main.ts'),
      'devtools/main': r('src/devtools/main.ts'),
      'pages/devtools-panel/main': r('src/pages/devtools-panel/main.tsx'),
      'pages/options/main': r('src/pages/options/main.tsx'),
      'pages/popup/main': r('src/pages/popup/main.tsx'),
      'pages/sidebar/main': r('src/pages/sidebar/main.tsx'),
    },
    output: {
      format: 'esm',
    },
  },
])
