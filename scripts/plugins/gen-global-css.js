import { extProtocol, r } from '../utils.js'

import postcss from 'postcss'

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @returns {Plugin}
 */
export default function genGlobalCss() {
  const globalRulesRoot = postcss.root()

  return {
    name: 'gen-global-css',
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

      // Emit global-rules.css
      this.emitFile({
        type: 'asset',
        fileName: 'global-rules.css',
        source: globalRulesRoot.toResult().css,
      })
    },
  }
}
