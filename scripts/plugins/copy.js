/**
 * https://github.com/LinbuduLab/esbuild-plugins/tree/main/packages/esbuild-plugin-copy
 */
import fs from 'fs-extra'

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
 */

/**
 * @param {CopyPluginOptions} options
 * @returns {import('esbuild').Plugin}
 */
export function CopyPlugin({ assets, transform }) {
  assets = formatAssets(assets)

  return {
    name: 'copy',
    setup(build) {
      build.onEnd(async result => {})
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
