import { pathToFileURL } from 'node:url'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @param {string} path
 * @returns {Plugin}
 */
export default function genManifest(path) {
  return {
    name: 'gen-manifest',
    buildStart() {
      this.addWatchFile(path)
    },
    async generateBundle() {
      const url = pathToFileURL(path) + `?t=${Date.now()}`

      // Generate manifest.json
      const manifest = (await import(url)).default

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      })
    },
  }
}
