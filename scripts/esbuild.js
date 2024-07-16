import { build, context } from 'esbuild'
import { copy as CopyPlugin } from 'esbuild-plugin-copy'
import stylePlugin from 'esbuild-style-plugin'
import fs from 'fs-extra'
import { execSync } from 'node:child_process'
import tailwindcss from 'tailwindcss'
import resolveConfig from 'tailwindcss/resolveConfig.js'
import tailwindConfig from '../tailwind.config.js'
import { BabelPlugin, pure } from './plugins/babel.js'
import { isDev, isFirefoxEnv, r } from './utils.js'

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
  sourcemap: isDev ? 'inline' : false,
  treeShaking: true,
  jsx: 'automatic',
  jsxDev: isDev,
  jsxSideEffects: false,
  metafile: !isDev,
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
  pure: pure,
  logLevel: 'info',
  color: true,
  plugins: [
    ...(isDev ? [] : [BabelPlugin()]),

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
  execSync('tsx ./scripts/manifest.js', { stdio: 'inherit' })
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
  } else {
    const result = await build(buildOptions)
    const contentScriptResult = await build(contentScriptOptions)

    // https://esbuild.github.io/analyze/
    // Analysis of the bundle

    fs.writeFileSync(
      r('dist/meta.json'),
      JSON.stringify(result.metafile, null, 2)
    )

    fs.writeFileSync(
      r('dist/content-script-meta.json'),
      JSON.stringify(contentScriptResult.metafile, null, 2)
    )
  }
}

main()
