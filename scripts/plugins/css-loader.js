import tailwindcss from '@tailwindcss/postcss'
import postcss from 'postcss'
import postcssPresetEnv from 'postcss-preset-env'
import { extProtocol, target } from '../utils.js'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @returns {Plugin}
 */
export default function cssLoader() {
  const processor = postcss([
    tailwindcss,
    postcssPresetEnv({ browsers: target }),
  ])
  const globalRulesRoot = postcss.root()

  return {
    name: 'css-loader',
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
        return processor
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
    async generateBundle(_, bundle) {
      for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
        if (!fileName.endsWith('.css')) continue

        const code =
          chunkOrAsset.type === 'chunk'
            ? chunkOrAsset.code
            : /** @type {string} */ (chunkOrAsset.source)

        const result = postcss.parse(code)

        // Add prefix to all URLs in src attributes
        result.walkDecls('src', (decl, index) => {
          if (decl.value.startsWith('url(assets/')) {
            decl.value =
              `url(${extProtocol}__MSG_@@extension_id__/` + decl.value.slice(4)
          }
        })

        result.walkAtRules(/^(?:property|font-face)$/, (atRule) => {
          atRule.remove()
          globalRulesRoot.append(atRule.clone())
        })

        const newCode = result.toResult().css

        if (chunkOrAsset.type === 'chunk') {
          chunkOrAsset.code = newCode
        } else {
          chunkOrAsset.source = newCode
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'global-rules.css',
        source: globalRulesRoot.toResult().css,
      })
    },
  }
}
