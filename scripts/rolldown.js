import { babel } from '@rollup/plugin-babel'
import tailwindcss from '@tailwindcss/postcss'
import chalk from 'chalk'
import fsExtra from 'fs-extra'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import postcss from 'postcss'
import { build, watch } from 'rolldown'
import copy from 'rollup-plugin-copy'
import Sonda from 'sonda/rolldown'
import { formatBytes, isDev, isFirefoxEnv, r } from './utils.js'

const _require = createRequire(import.meta.url)

/**
 * @import { RolldownOptions, BuildOptions, OutputAsset, OutputChunk } from "rolldown"
 * @import { TransformCallback } from "postcss"
 */

const cwd = process.cwd()
const outdir = r('dist/dev')
const target = '> 0.5%, last 2 versions, Firefox ESR, not dead'
const extensionProtocol = isFirefoxEnv
  ? 'moz-extension://'
  : 'chrome-extension://'

function writeManifest() {
  execSync('node --experimental-strip-types ./scripts/gen-manifest.ts', {
    stdio: 'inherit',
  })
}

const globalRulesRoot = postcss.root()

/**
 * 将需要定义在全局的 CSS 规则提取到单独的文件中。
 * 例如 `@property`, `@font-face` 规则
 *
 * @type {TransformCallback}
 */
const postcssExtractGlobalRules = (root) => {
  root.each((node) => {
    if (node.type !== 'atrule') {
      return
    }

    if (node.name === 'property') {
      node.remove()
      globalRulesRoot.append(node.clone())
    }
  })
}

/**
 * @satisfies {RolldownOptions}
 */
const sharedOptions = {
  output: {
    dir: outdir,
    legalComments: 'inline',
    sourcemap: isDev ? 'inline' : false,
    hashCharacters: 'hex',
    assetFileNames: 'assets/[name].[hash][extname]',
    chunkFileNames: 'assets/[name].[hash].js',
  },
  optimization: {
    inlineConst: !isDev,
  },
  define: {
    IS_FIREFOX_ENV: JSON.stringify(isFirefoxEnv),
    IS_DEV: JSON.stringify(isDev),
    IS_PROD: JSON.stringify(!isDev),
  },
  logLevel: 'info',
  platform: 'browser',
  resolve: {
    alias: {
      '~': r('src'),
      '~ext-root': `${extensionProtocol}__MSG_@@extension_id__`,
    },
  },
  external: [`${extensionProtocol}__MSG_@@extension_id__/*`],
  moduleTypes: {
    '.woff': 'asset',
    '.woff2': 'asset',
  },
  plugins: [
    // Sonda(),
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
          return postcss([tailwindcss, postcssExtractGlobalRules])
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
    {
      name: 'add-prefix-to-assets-url',
      generateBundle: {
        handler(outputOptions, bundle, isWrite) {
          // TODO: move this to the postcss plugin
          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (fileName.endsWith('.css')) {
              const code =
                chunk.type === 'chunk'
                  ? chunk.code
                  : /** @type {string} */ (chunk.source)

              if (/(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g.test(code)) {
                const newCode = code.replaceAll(
                  /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g,
                  (match, before, url, after) => {
                    return `${before}${extensionProtocol}__MSG_@@extension_id__/${url}${after}`
                  },
                )

                if (chunk.type === 'chunk') {
                  chunk.code = newCode
                } else {
                  chunk.source = newCode
                }
              }
            }
          }

          this.emitFile({
            type: 'asset',
            fileName: 'properties.css',
            source: globalRulesRoot.toResult().css,
          })
        },
      },
    },

    // FIXME: use filter to exclude node_modules
    babel({
      babelHelpers: 'bundled',
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
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      exclude: /node_modules/,
      skipPreflightCheck: true,
    }),
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
      'content-scripts/main': r('src/content-scripts/main.tsx'),
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
      fonts: r('src/styles/fonts.ts'),
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

    const sizes = outputs.map((output) => calcSize(output))

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
        color(size.fileName) +
          ` `.padEnd(filenameLength - size.fileName.length),
        chalk.white(size.rawText),
      )
    }

    const totalText = formatBytes(totalSize)

    console.log(
      chalk.gray('total'),
      ' '.repeat(filenameLength - (totalText.length - sizeTextLength)),
      chalk.white(totalText),
    )
  }
}

/**
 * @param {OutputAsset | OutputChunk} chunk
 */
function calcSize(chunk) {
  const content = chunk.type === 'chunk' ? chunk.code : chunk.source

  const raw = Buffer.byteLength(content, 'utf-8')

  return {
    raw,
    rawText: formatBytes(raw),
    fileName: chunk.fileName,
    isEntry: chunk.type === 'chunk' && chunk.isEntry,
  }
}

main()
