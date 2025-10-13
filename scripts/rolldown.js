import { babel } from '@rollup/plugin-babel'
import tailwindcss from '@tailwindcss/postcss'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { mapValues } from 'es-toolkit'
import fsExtra from 'fs-extra'
import { exec } from 'node:child_process'
import { createRequire } from 'node:module'
import { styleText } from 'node:util'
import path from 'node:path'
import postcss from 'postcss'
import { build, watch } from 'rolldown'
import copy from 'rollup-plugin-copy'
import { PURE_CALLS, pureFunctions } from './plugins/babel.js'
import { formatBytes, isDev, isFirefoxEnv, r } from './utils.js'
import ImportSuffix from './plugins/import-suffix.js'

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
    typescript: {
      onlyRemoveTypeImports: false,
    },
  },
  define: mapValues(
    {
      IS_FIREFOX_ENV: isFirefoxEnv,
      IS_DEV: isDev,
      IS_PROD: !isDev,
    },
    (v) => JSON.stringify(v),
  ),
  resolve: {
    // https://webpack.js.org/configuration/resolve/#resolvealias
    alias: {
      '~/*': r('src/*'),
      '~ext-root$': `${extensionProtocol}__MSG_@@extension_id__`,
    },
  },
  external: [
    // https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Internationalization#predefined_messages
    'moz-extension://__MSG_@@extension_id__/*',
    'chrome-extension://__MSG_@@extension_id__/*',
  ],
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
    ImportSuffix(),
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
          // TODO: support css modules
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
    // TODO: is it possible to transform after jsx and typescript compilation?
    babel({
      babelHelpers: 'bundled',
      configFile: false,
      babelrc: false,
      skipPreflightCheck: true,
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
      'content-scripts/start': r('src/content-scripts/start.ts'),
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
      'content-scripts/main': r('src/content-scripts/main.tsx'),
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
          { src: 'src/devtools/index.html', dest: 'dist/dev' },
        ],
      }),
      {
        name: 'emit-global-rules',
        generateBundle: {
          async handler(outputOptions, bundle, isWrite) {
            // Remove unused assets
            delete bundle['common.js']

            this.emitFile({
              type: 'asset',
              fileName: 'global-rules.css',
              source: globalRulesRoot.toResult().css,
            })

            const templateHtml = await this.fs.readFile(
              r('src/pages/index.html'),
              { encoding: 'utf8' },
            )

            // Generate HTML files for each page
            for (const [fileName, chunk] of Object.entries(bundle)) {
              if (chunk.type !== 'chunk' || !chunk.isEntry) continue
              if (!fileName.startsWith('pages/')) continue

              const htmlName = path.posix.join(
                path.dirname(fileName),
                'index.html',
              )

              const htmlCode = templateHtml.replace(
                '__MAIN_SCRIPT__',
                `./${path.basename(fileName)}`,
              )

              this.emitFile({
                type: 'asset',
                fileName: htmlName,
                source: htmlCode,
                name: 'index.html',
              })
            }
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
  let totalSize = 0
  let longestFileName = 0
  let longestSizeText = 0

  const outputs = results
    .flatMap((result) => {
      return result.output.map((out) => {
        const content = out.type === 'chunk' ? out.code : out.source
        const byteLength = Buffer.byteLength(content, 'utf-8')
        const sizeText = formatBytes(byteLength)

        totalSize += byteLength
        longestFileName = Math.max(longestFileName, out.fileName.length)
        longestSizeText = Math.max(longestSizeText, sizeText.length)

        return {
          byteLength,
          sizeText: formatBytes(byteLength),
          isEntry: out.type === 'chunk' && out.isEntry,
          ...out,
        }
      })
    })
    .sort((a, b) => {
      const aType = a.type === 'chunk' && a.isEntry ? 'entry' : a.type
      const bType = b.type === 'chunk' && b.isEntry ? 'entry' : b.type
      const priority = {
        entry: 0,
        chunk: 1,
        asset: 1,
      }

      if (priority[aType] !== priority[bType]) {
        return priority[aType] - priority[bType]
      }

      if (a.byteLength !== b.byteLength) {
        return b.byteLength - a.byteLength
      }

      return a.fileName.localeCompare(b.fileName)
    })

  const filenameLength = longestFileName + 2

  for (const out of outputs) {
    out.sizeText = out.sizeText.padStart(longestSizeText)
  }

  for (const out of outputs) {
    const isEntry = out.isEntry

    console.log(
      styleText('gray', isEntry ? 'entry' : 'chunk'),
      styleText(isEntry ? 'blue' : 'green', out.fileName) +
        ` `.padEnd(filenameLength - out.fileName.length),
      styleText('white', out.sizeText),
    )
  }

  // Horizontal rule
  console.log('-'.repeat(filenameLength + longestSizeText + 7))

  const totalText = formatBytes(totalSize)

  console.log(
    styleText('gray', 'total'),
    ' '.repeat(filenameLength - (totalText.length - longestSizeText)),
    styleText('white', totalText),
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
      console.error('[watch]', data.error)
      return
    }

    if (data.code === 'START') {
      time = performance.now()
    }

    const buildTime = (performance.now() - time).toFixed(2)

    console.log(
      styleText('cyan', '[watch]'),
      styleText('green', data.code),
      data.code === 'END' ? `in ${buildTime}ms` : '',
    )
  })

  watcher.on('change', (e, change) => {
    console.log(
      styleText('cyan', '[watch]'),
      styleText('green', change.event),
      e.slice(cwd.length + 1),
    )
  })

  fsExtra.watchFile(r('scripts/gen-manifest.ts'), () => {
    writeManifest()
  })
} else {
  // TODO: generate metadata.json to analyze the bundle
  const results = await build(buildOptions)

  logBuildResult(results)
}
