import type { BuildOptions, Plugin } from 'esbuild'
import { build, context } from 'esbuild'
import { copy as CopyPlugin } from 'esbuild-plugin-copy'
import stylePlugin from 'esbuild-style-plugin'
import { emptyDirSync, ensureDirSync, watchFile } from 'fs-extra'
import { execSync } from 'node:child_process'
import tailwindcss from 'tailwindcss'
import AutoImport from 'unplugin-auto-import/esbuild'
import { isDev, isFirefoxEnv, r } from './utils'

const cwd = process.cwd()
const outdir = r('dist/dev')

const options: BuildOptions = {
  entryPoints: [
    r('src/background/main.ts'),
    r('src/devtools/main.ts'),
    r('src/pages/devtools-panel/main.tsx'),
    r('src/pages/options/main.ts'),
  ],
  legalComments: 'eof',
  supported: {
    nesting: false,
  },
  jsx: 'automatic',
  jsxDev: isDev,
  splitting: true,
  target: ['chrome100', 'es2022', 'firefox115'],
  format: 'esm',
  platform: 'browser',
  chunkNames: 'chunks/[name]-[hash]',
  treeShaking: true,
  bundle: true,
  assetNames: 'assets/[name]-[hash]',
  outbase: 'src',
  outdir: outdir,
  loader: {
    '.woff2': 'file',
  },
  plugins: [
    AutoImport({
      include: [
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      ],
      imports: [
        {
          'webextension-polyfill': [['*', 'browser']],
          ulid: ['ulid'],
        },
      ],
      dts: r('src/types/auto-imports.d.ts'),
    }) as Plugin,

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
          tailwindcss,
        ],
      },
    }),
  ],
}

ensureDirSync(outdir)
emptyDirSync(outdir)
writeManifest()

if (isDev) {
  context(options).then(ctx => ctx.watch())

  watchFile(r('src/manifest.ts'), () => {
    writeManifest()
  })
} else {
  build(options)
}

function writeManifest() {
  console.log('write manifest')
  execSync('npx esno ./scripts/manifest.ts', { stdio: 'inherit' })
}
