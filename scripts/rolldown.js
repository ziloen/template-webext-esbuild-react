import { babel } from '@rollup/plugin-babel'
import tailwindcss from '@tailwindcss/postcss'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import chalk from 'chalk'
import fsExtra from 'fs-extra'
import { exec } from 'node:child_process'
import { createRequire } from 'node:module'
import postcss from 'postcss'
import { build, watch } from 'rolldown'
import copy from 'rollup-plugin-copy'
import { PURE_CALLS, pureFunctions } from './plugins/babel.js'
import { formatBytes, isDev, isFirefoxEnv, r } from './utils.js'

/**
 * @import { RolldownOptions, BuildOptions, OutputAsset, OutputChunk, RolldownOutput } from "rolldown"
 * @import { TransformCallback } from "postcss"
 */

const cwd = process.cwd()
const outdir = r('dist/dev')
const target = '> 0.5%, last 2 versions, Firefox ESR, not dead'
const extensionProtocol = isFirefoxEnv
  ? 'moz-extension://'
  : 'chrome-extension://'

const globalRulesRoot = postcss.root()
const _require = createRequire(import.meta.url)

/**
 * @satisfies {RolldownOptions}
 */
const sharedOptions = {
  platform: 'browser',
  output: {
    dir: outdir,
    legalComments: 'inline',
    sourcemap: isDev ? 'inline' : false,
    hashCharacters: 'hex',
    assetFileNames: 'assets/[name].[hash][extname]',
    chunkFileNames: 'assets/[name].[hash].js',
  },
  transform: {
    target: browserslistToEsbuild(target),
  },
  define: {
    IS_FIREFOX_ENV: JSON.stringify(isFirefoxEnv),
    IS_DEV: JSON.stringify(isDev),
    IS_PROD: JSON.stringify(!isDev),
  },
  resolve: {
    alias: {
      '~/*': r('src/*'),
      '~ext-root$': `${extensionProtocol}__MSG_@@extension_id__`,
    },
  },
  external: [`${extensionProtocol}__MSG_@@extension_id__/*`],
  moduleTypes: {
    '.woff': 'asset',
    '.woff2': 'asset',
  },
  optimization: {
    inlineConst: !isDev,
  },
  treeshake: {
    manualPureFunctions: pureFunctions,
    moduleSideEffects: [
      {
        test: /node_modules[\\/]react[\\/]index\.js/,
        sideEffects: false,
      },
    ],
  },
  logLevel: 'info',
  experimental: {
    attachDebugInfo: 'none',
  },
  plugins: [
    // Sonda(),
    {
      name: 'process-css',
      transform: {
        filter: {
          id: {
            include: /\.css$/,
            exclude: /node_modules/,
          },
        },
        order: 'post',
        handler(code, id, meta) {
          // FIXME: tailwind 运行了两次？
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
      generateBundle: {
        handler(outputOptions, bundle, isWrite) {
          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (!fileName.endsWith('.css')) continue

            const code =
              chunk.type === 'chunk'
                ? chunk.code
                : /** @type {string} */ (chunk.source)

            const result = postcss.parse(code)

            // Add prefix to all URLs in src attributes
            result.walkDecls('src', (decl, index) => {
              if (decl.value.startsWith('url(assets/')) {
                decl.value =
                  `url(${extensionProtocol}__MSG_@@extension_id__/` +
                  decl.value.slice(4)
              }
            })

            result.walkAtRules(/^(?:property|font-face)$/, (atRule) => {
              atRule.remove()
              globalRulesRoot.append(atRule.clone())
            })

            const newCode = result.toResult().css

            if (chunk.type === 'chunk') {
              chunk.code = newCode
            } else {
              chunk.source = newCode
            }
          }
        },
      },
    },

    // FIXME: use filter to exclude node_modules
    babel({
      babelHelpers: 'bundled',
      parserOpts: {
        plugins: ['jsx', 'typescript'],
      },
      presets: [
        [
          '@babel/preset-env',
          {
            targets: target,
            useBuiltIns: 'usage',
            corejs: {
              version: _require('core-js/package.json').version,
              proposals: false,
            },
            shippedProposals: true,
            ignoreBrowserslistConfig: true,
            bugfixes: true,
            loose: false,
            modules: false,
          },
        ],
      ],
      plugins: [
        [
          'babel-plugin-annotate-module-pure',
          {
            pureCalls: PURE_CALLS,
          },
        ],
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      exclude: /node_modules/,
      skipPreflightCheck: true,
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
      'content-scripts/main': r('src/content-scripts/main.tsx'),
    },
    output: {
      ...sharedOptions.output,
      format: 'iife',
    },
  },
  {
    ...sharedOptions,
    input: {
      common: r('src/styles/common.css'),
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
      {
        name: 'emit-global-rules',
        generateBundle: {
          handler(outputOptions, bundle, isWrite) {
            // Remove unused assets
            delete bundle['common.js']

            this.emitFile({
              type: 'asset',
              fileName: 'global-rules.css',
              source: globalRulesRoot.toResult().css,
            })
          },
        },
      },
    ],
  },
]

function writeManifest() {
  exec('node ./scripts/gen-manifest.ts')
}

/**
 * @param {RolldownOutput[]} results
 */
function logBuildResult(results) {
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

  const spaceLength = 2

  const filenameLength =
    Math.max(...outputs.map((output) => output.fileName.length)) + spaceLength

  const sizes = outputs.map((chunk) => {
    const content = chunk.type === 'chunk' ? chunk.code : chunk.source

    const raw = Buffer.byteLength(content, 'utf-8')

    return {
      raw,
      rawText: formatBytes(raw),
      fileName: chunk.fileName,
      isEntry: chunk.type === 'chunk' && chunk.isEntry,
    }
  })

  const sizeTextLength = Math.max(...sizes.map((size) => size.rawText.length))

  let totalSize = 0
  for (const size of sizes) {
    size.rawText = size.rawText.padStart(sizeTextLength)
    totalSize += size.raw
  }

  for (const size of sizes) {
    const isEntry = size.isEntry

    const color = isEntry ? chalk.hex('#61afef') : chalk.hex('#98c379')

    console.log(
      chalk.gray(isEntry ? 'entry' : 'chunk'),
      color(size.fileName) + ` `.padEnd(filenameLength - size.fileName.length),
      chalk.white(size.rawText),
    )
  }

  const totalText = formatBytes(totalSize)

  // Horizontal rule
  console.log('-'.repeat(filenameLength + sizeTextLength + 7))

  console.log(
    chalk.gray('total'),
    ' '.repeat(filenameLength - (totalText.length - sizeTextLength)),
    chalk.white(totalText),
  )
}

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

    if (data.code === 'ERROR') {
      console.error('watcher:', data.error)
      return
    }

    if (data.code === 'START') {
      time = performance.now()
    }

    const buildTime = (performance.now() - time).toFixed(2)

    console.log(
      `watcher: ${data.code}${data.code === 'END' ? ` in ${buildTime}ms` : ''}`,
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

  logBuildResult(results)
}
