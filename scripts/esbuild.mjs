import { build, context } from 'esbuild'
import { copy as CopyPlugin } from 'esbuild-plugin-copy'
import stylePlugin from 'esbuild-style-plugin'
import fs from 'fs-extra'
import { execSync } from 'node:child_process'
import tailwindcss from 'tailwindcss'
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../tailwind.config'
import { esbuildBabel } from './plugins/babel.mjs'
import { isDev, isFirefoxEnv, r } from './utils.mjs'

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

const fullConfig = resolveConfig(tailwindConfig)
const cwd = process.cwd()
const outdir = r('dist/dev')

/**
 * @type {BuildOptions}
 */
const sharedOptions = {
  supported: { nesting: false },
  minify: !isDev,
  bundle: true,
  legalComments: isDev ? 'none' : 'eof',
  drop: isDev ? [] : ['console', 'debugger'],
  sourcemap: isDev ? 'external' : false,
  treeShaking: true,
  jsx: 'automatic',
  jsxDev: isDev,
  jsxSideEffects: false,
  target: ['chrome100', 'es2022', 'firefox115'],
  platform: 'browser',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'assets/[name]-[hash]',
  // https://developer.chrome.com/docs/extensions/reference/api/i18n#overview-predefined
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#predefined_messages
  external: [
    'chrome-extension://__MSG_@@extension_id__/*',
    'moz-extension://__MSG_@@extension_id__/*',
  ],
  alias: {
    '~ext-root': isFirefoxEnv
      ? 'moz-extension://__MSG_@@extension_id__'
      : 'chrome-extension://__MSG_@@extension_id__',
  },
  outbase: 'src',
  outdir: outdir,
  define: {},
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
  },
  pure: [
    'Math.random',
    'Math.floor',
    'Math.ceil',
    'Math.round',
    'Math.abs',
    'Math.min',
    'Math.max',
    'Math.pow',
  ],
  plugins: [
    ...(isDev ? [] : [esbuildBabel()]),

    CopyPlugin({
      resolveFrom: 'cwd',
      assets: [
        { from: 'public/**/*', to: 'dist/dev' },
        { from: 'src/pages/**/*.html', to: 'dist/dev/pages' },
        { from: 'src/devtools/index.html', to: 'dist/dev/devtools' },
      ],
      watch: isDev,
    }),

    stylePlugin({
      postcss: {
        plugins: [
          // @ts-expect-error tailwindcss issue
          tailwindcss(fullConfig),
        ],
      },
    }),
  ],
}

/**
 * @type {BuildOptions}
 */
const options = {
  ...sharedOptions,
  entryPoints: [
    r('src/background/main.ts'),
    r('src/devtools/main.ts'),
    r('src/pages/devtools-panel/main.tsx'),
    r('src/pages/options/main.tsx'),
  ],
  format: 'esm',
  splitting: true,
}

/**
 * @type {BuildOptions}
 */
const contentScriptOptions = {
  ...sharedOptions,
  entryPoints: [r('src/content-scripts/main.ts')],
  format: 'iife',
  splitting: false,
}

function writeManifest() {
  execSync('npx esno ./scripts/manifest.mjs', { stdio: 'inherit' })
}

async function main() {
  fs.ensureDirSync(outdir)
  fs.emptyDirSync(outdir)
  writeManifest()

  if (isDev) {
    const ctxs = await Promise.all([
      context(options),
      context(contentScriptOptions),
    ])

    for (const ctx of ctxs) {
      ctx.watch()
    }

    fs.watchFile(r('src/manifest.ts'), () => {
      writeManifest()
    })
  } else {
    await build(options)
    await build(contentScriptOptions)
  }
}

main()
