/**
 * https://github.com/LinbuduLab/esbuild-plugins/tree/main/packages/esbuild-plugin-copy
 */
import chokidar from 'chokidar'
import fsExtra from 'fs-extra'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * @typedef {object} AssetPair
 * @property {string} from from path is resolved based on `cwd`
 * @property {string} to
 * @property {boolean} [watch=false]
 * @property {(code: string) => (string | Promise<string>)} [transform]
 */

/**
 * @typedef {object} CopyPluginOptions
 * @property {AssetPair | AssetPair[]} assets
 * @property {(code: string) => (string | Promise<string>)} [transform]
 * @property {boolean} [watch=false]
 */

/**
 * @param {CopyPluginOptions} options
 * @returns {import('esbuild').Plugin}
 */
export function CopyPlugin({
  assets,
  transform: globalTrasform,
  watch = false,
}) {
  assets = formatAssets(assets)

  return {
    name: 'copy',
    setup(build) {
      if (!assets.length) return

      const outDir = build.initialOptions.outdir

      build.onEnd(async (result) => {
        for await (const asset of assets) {
          const fromPaths = [
            ...new Set(await Array.fromAsync(fs.glob(asset.from))),
          ]

          function executor() {
            for (const fromPath of fromPaths) {
            }
          }

          if (watch) {
            const watcher = chokidar.watch(asset.from, {
              // disableGlobbing: false,
            })

            watcher.on('change', (fromPath) => {})
          }
        }
      })
    },
  }
}

/**
 * @param { AssetPair | AssetPair[]} assets
 * @returns {AssetPair[]}
 */
function formatAssets(assets) {
  assets = Array.isArray(assets) ? assets : [assets]
  return assets.filter((asset) => asset.from && asset.to)
}

/**
 * @param {AssetPair} param0
 */
async function copy({ transform, from, to }) {
  const content = fsExtra.readFileSync(from, 'utf-8')
  const code = transform ? await transform(content) : content
  const toPath = path.join(to, path.basename(from))
  fsExtra.ensureDirSync(path.dirname(toPath))
  fsExtra.writeFileSync(toPath, code)
}

// Add `<script src="http://localhost:8097"></script>` to the end of the head tag
// Transform all `.tsx` and `.ts` to `.js`
