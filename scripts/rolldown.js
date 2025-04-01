import url from '@rollup/plugin-url'
import fs from 'fs-extra'
import { execSync } from 'node:child_process'
import { build, watch } from 'rolldown'
import copy from 'rollup-plugin-copy'
import { isDev, isFirefoxEnv, r } from './utils.js'

/**
 * @import { RolldownOptions, BuildOptions } from "rolldown"
 */

const cwd = process.cwd()
const outdir = r('dist/dev')

function writeManifest() {
  execSync('tsx ./scripts/manifest.js', { stdio: 'inherit' })
}

/**
 * @type {RolldownOptions}
 */
const sharedOptions = {
  output: {
    dir: outdir,
  },
  logLevel: isDev ? 'debug' : 'debug',
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
      destDir: r('dist/dev/assets'),
      fileName: '[hash][extname]',
    }),
  ],
}

/**
 * @type {BuildOptions[]}
 */
const buildOptions = [
  {
    ...sharedOptions,
    input: {
      'content-script/main': r('src/content-scripts/main.ts'),
    },
    output: {
      ...sharedOptions.output,
      format: 'iife',
    },
    plugins: [
      .../**@type{*} */ (sharedOptions.plugins),
      copy({
        cwd: cwd,
        flatten: false,
        targets: [
          { src: 'public/**/*', dest: 'dist/dev' },
          { src: 'src/pages/**/*.html', dest: 'dist/dev' },
          { src: 'src/devtools/index.html', dest: 'dist/dev' },
        ],
      }),
    ],
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
      ...sharedOptions.output,
      format: 'esm',
    },
  },
]

async function main() {
  fs.ensureDirSync(outdir)
  fs.emptyDirSync(outdir)
  writeManifest()

  if (isDev) {
    const watcher = watch(buildOptions)

    fs.watchFile(r('src/manifest.ts'), () => {
      writeManifest()
    })
  } else {
    const result = await build(buildOptions)
  }
}

main()
