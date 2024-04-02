import { build, context } from 'esbuild'
import { copy as CopyPlugin } from 'esbuild-plugin-copy'
import fs from 'fs-extra'
import { exec, execSync } from 'node:child_process'
import { esbuildBabel } from './plugins/babel.mjs'
import { isDev, isFirefoxEnv, r } from './utils.mjs'

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

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
  logLevel: 'info',
  color: true,
  plugins: [...(isDev ? [] : [esbuildBabel()])],
}

/**
 * @type {BuildOptions}
 */
const buildOptions = {
  ...sharedOptions,
  entryPoints: [
    r('src/background/main.ts'),
    r('src/devtools/main.ts'),
    r('src/pages/devtools-panel/main.tsx'),
    r('src/pages/options/main.tsx'),
    r('src/pages/popup/main.tsx'),
    r('src/pages/sidebar/main.tsx'),
  ],
  format: 'esm',
  splitting: true,
  plugins: [
    ...(sharedOptions.plugins ?? []),

    CopyPlugin({
      resolveFrom: 'cwd',
      assets: [
        { from: 'public/**/*', to: 'dist/dev' },
        { from: 'src/pages/**/*.html', to: 'dist/dev/pages' },
        { from: 'src/devtools/index.html', to: 'dist/dev/devtools' },
      ],
      watch: isDev,
    }),
  ],
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
      context(buildOptions),
      context(contentScriptOptions),
    ])

    for (const ctx of ctxs) {
      ctx.watch()
    }

    fs.watchFile(r('src/manifest.ts'), () => {
      writeManifest()
    })

    exec(
      'npx tailwindcss -i ./src/styles/tailwind.css -o ./dist/dev/tailwind.css --watch'
    )
  } else {
    exec(
      'npx tailwindcss -i ./src/styles/tailwind.css -o ./dist/dev/tailwind.css'
    )
    await build(buildOptions)
    await build(contentScriptOptions)
  }
}

main()
