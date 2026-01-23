import path from 'node:path'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @returns {Plugin}
 */
export default function importSuffix() {
  const filter = /\?(?:url|raw|dataurl)$/

  return {
    name: 'import-suffix',

    resolveId: {
      filter: {
        id: filter,
      },
      async handler(source, importer, extraOptions) {
        const match = source.match(filter)?.[0]

        if (!match) {
          return null
        }

        const resolved = await this.resolve(
          source.slice(0, source.length - match.length),
          importer,
          { skipSelf: true },
        )

        if (resolved && !resolved.external) {
          return resolved.id + match
        }

        return null
      },
    },

    load: {
      filter: {
        id: filter,
      },

      async handler(id) {
        const match = id.match(filter)?.[0]

        if (!match) {
          return null
        }

        const filePath = id.slice(0, id.length - match.length)

        this.addWatchFile(filePath)

        const fileBuffer = await this.fs.readFile(filePath)
        const fileName = path.basename(filePath)
        const referenceId = this.emitFile({
          type: 'asset',
          name: fileName,
          source: fileBuffer,
        })

        return {
          code: `export default import.meta.ROLLUP_FILE_URL_${referenceId}`,
          moduleType: 'js',
          moduleSideEffects: false,
        }
      },
    },
  }
}
