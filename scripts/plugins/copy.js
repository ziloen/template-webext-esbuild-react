/**
 * https://github.com/LinbuduLab/esbuild-plugins/tree/main/packages/esbuild-plugin-copy
 */
import fs from 'fs-extra'
import { globby } from 'globby'
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
export function CopyPlugin({ assets, transform, watch = false }) {
  assets = formatAssets(assets)

  return {
    name: 'copy',
    setup(build) {
      if (!assets.length) return

      const outDir = build.initialOptions.outdir

      build.onEnd(async result => {
        for await (const asset of assets) {
          const fromPaths = await globby(asset.from, {
            expandDirectories: false,
            onlyFiles: true,
          })
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
  return assets.filter(asset => asset.from && asset.to)
}

// Add `<script src="http://localhost:8097"></script>` to the end of the head tag
// Transform all `.tsx` and `.ts` to `.js`
