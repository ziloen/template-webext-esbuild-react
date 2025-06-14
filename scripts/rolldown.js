import tailwindcss from '@tailwindcss/postcss'
import chalk from 'chalk'
import fsExtra from 'fs-extra'
import { execSync } from 'node:child_process'
import postcss from 'postcss'
import { build, watch } from 'rolldown'
import copy from 'rollup-plugin-copy'
import { isDev, isFirefoxEnv, r } from './utils.js'

/**
 * @import { RolldownOptions, BuildOptions } from "rolldown"
 */

const cwd = process.cwd()
const outdir = r('dist/dev')

function writeManifest() {
  execSync('node --experimental-strip-types ./scripts/gen-manifest.ts', {
    stdio: 'inherit',
  })
}

/**
 * @satisfies {RolldownOptions}
 */
const sharedOptions = {
  output: {
    dir: outdir,
    legalComments: 'inline',
  },
  logLevel: 'info',
  platform: 'browser',
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
  moduleTypes: {
    '.woff': 'asset',
    '.woff2': 'asset',
  },
  plugins: [
    {
      name: 'postcss',
      transform: {
        filter: {
          id: {
            include: /\.css$/,
            exclude: /node_modules/,
          },
        },
        handler(code, id, meta) {
          return postcss([tailwindcss])
            .process(code, {
              from: id,
              to: id,
              map: false,
            })
            .then((result) => ({
              code: result.css,
              map: { mappings: '' },
            }))
        },
      },
    },
  ],
  experimental: {
    attachDebugInfo: 'none',
  },
}

/**
 * @type {BuildOptions[]}
 */
const buildOptions = [
  {
    ...sharedOptions,
    input: {
      'content-scripts/main': r('src/content-scripts/main.ts'),
      fonts: r('src/styles/fonts.ts'),
    },
    output: {
      ...sharedOptions.output,
      format: 'iife',
    },
    plugins: [
      ...sharedOptions.plugins,
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
      tailwind: r('src/styles/tailwind.css'),
      'background/main': r('src/background/main.ts'),
      'devtools/main': r('src/devtools/main.ts'),
      'pages/devtools-panel/main': r('src/pages/devtools-panel/main.tsx'),
      'pages/options/main': r('src/pages/options/main.tsx'),
      'pages/popup/main': r('src/pages/popup/main.tsx'),
      'pages/sidebar/main': r('src/pages/sidebar/main.tsx'),
    },
    experimental: {
      ...sharedOptions.experimental,
    },
    output: {
      ...sharedOptions.output,
      format: 'esm',
    },
  },
]

async function main() {
  fsExtra.ensureDirSync(outdir)
  fsExtra.emptyDirSync(outdir)
  writeManifest()

  if (isDev) {
    const watcher = watch(buildOptions)

    let time = 0
    watcher.on('event', (data) => {
      if (data.code.includes('_')) {
        return
      }
      if (data.code === 'START') {
        time = performance.now()
      }

      const buildTime = (performance.now() - time).toFixed(2)

      console.log(
        `watcher event: ${data.code}${data.code === 'END' ? ` in ${buildTime}ms` : ''}`,
      )
    })

    watcher.on('change', (e, change) => {
      console.log(`${change.event}: ${e.slice(cwd.length + 1)}`)
    })

    fsExtra.watchFile(r('scripts/gen-manifest.ts'), () => {
      writeManifest()
    })
  } else {
    const results = await build(buildOptions)

    const outputs = results
      .flatMap((result) => result.output)
      .sort((a, b) => {
        const aType = a.type === 'chunk' && a.isEntry ? 'entry' : a.type
        const bType = b.type === 'chunk' && b.isEntry ? 'entry' : b.type
        const priority = {
          entry: 0,
          chunk: 1,
          asset: 2,
        }

        if (aType !== bType) {
          return priority[aType] - priority[bType]
        }

        return a.fileName.localeCompare(b.fileName)
      })

    for (const output of outputs) {
      const isEntry = output.type === 'chunk' && output.isEntry

      const color =
        output.type === 'chunk'
          ? output.isEntry
            ? chalk.hex('#61afef') // blue
            : chalk.hex('#98c379') // green
          : chalk.hex('#d19a66') // orange

      console.log(
        chalk.gray(isEntry ? 'entry' : output.type),
        color(output.fileName),
      )
    }
  }
}

main()
