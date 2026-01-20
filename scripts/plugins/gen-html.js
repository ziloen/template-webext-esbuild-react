import path from 'node:path'
import { r } from '../utils.js'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @typedef {Object} Options
 * @property {string} templateHtmlPath Path to the HTML template file
 */

/**
 * @param {Options} options
 * @returns {Plugin}
 */
export default function genHtml(options) {
  return {
    name: 'gen-html',
    async generateBundle(_, bundle) {
      // Generate HTML files for each page
      const templateHtml = await this.fs.readFile(r(options.templateHtmlPath), {
        encoding: 'utf8',
      })

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) continue
        if (!fileName.startsWith('pages/')) continue

        const htmlName = path.posix.join(path.dirname(fileName), 'index.html')

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
  }
}
