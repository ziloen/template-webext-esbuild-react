import { transform } from '@babel/core'
import { valueToNode } from '@babel/types'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * @import { TransformOptions } from "@babel/core"
 */

/** @type {import("babel-plugin-annotate-module-pure").Options["pureCalls"]} */
export const PURE_CALLS = {
  classnames: ['default'],
  clsx: ['default', 'clsx'],
  'clsx/lite': ['default', 'clsx'],
  'es-toolkit': ['mapValues'],
  'lodash-es': [
    'clamp',
    'clone',
    'debounce',
    'escapeRegExp',
    'findIndex',
    'identity',
    'inRange',
    'isBoolean',
    'isEmpty',
    'isEqual',
    'isFunction',
    'isNil',
    'isPlainObject',
    'memoize',
    'memoize',
    'noop',
    'pickBy',
    'throttle',
  ],
  'mobx-react': ['observer'],
  'mobx-react-lite': ['observer'],
  react: [
    'cloneElement',
    'createContext',
    'createElement',
    'createFactory',
    'createRef',
    'forwardRef',
    'isValidElement',
    'lazy',
    'memo',
  ],
  'react-dom': ['createPortal'],
  rxjs: ['fromEventPattern', 'share', 'Subject'],
  'rxjs/operators': ['share'],
  'serialize-error': ['deserializeError', 'serializeError'],
  'tailwind-merge': ['twMerge', 'extendTailwindMerge'],
  uuid: ['v4', 'v7'],
  'webextension-polyfill': [
    ['default', 'i18n', 'detectLanguage'],
    ['default', 'runtime', 'getManifest'],
    ['default', 'runtime', 'getURL'],
    ['default', 'tabs', 'query'],
    ['i18n', 'detectLanguage'],
    ['runtime', 'getManifest'],
    ['runtime', 'getURL'],
    ['tabs', 'query'],
  ],
  zod: [
    ['z', 'array'],
    ['z', 'boolean'],
    ['z', 'number'],
    ['z', 'object'],
    ['z', 'string'],
  ],
}

/**
 * This plugin is used to mark some function calls as pure, so that they can be removed by the minifier.
 * @returns {import('esbuild').Plugin}
 */
export function BabelPlugin() {
  /** @type {TransformOptions} */
  const config = {
    parserOpts: {
      plugins: ['jsx', 'typescript'],
    },
    plugins: [
      [
        'babel-plugin-annotate-module-pure',
        {
          pureCalls: PURE_CALLS,
        },
      ],
      // Precompute pure `clsx` calls
      {
        visitor: {
          CallExpression(path, state) {
            const clleePath = path.get('callee')

            if (!(clleePath.isIdentifier() && clleePath.node.name === 'clsx')) {
              return
            }

            const args = path.get('arguments')

            const classNames = []

            for (const arg of args) {
              if (!arg.isStringLiteral()) {
                return
              }
              classNames.push(arg.node.value)
            }

            const clsx = require('clsx')

            path.replaceWith(valueToNode(clsx(classNames)))
          },
        },
      },
    ],
  }

  /**
   * @param {string} code
   * @returns {Promise<string>}
   */
  function transformContents(code) {
    return new Promise((resolve, reject) => {
      transform(code, config, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(/** @type **/ (result).code)
        }
      })
    })
  }

  return {
    name: 'babel',
    setup(build) {
      build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
        const code = await fs.readFile(args.path, 'utf-8')
        return {
          contents: await transformContents(code),
          loader: args.path.endsWith('x') ? 'tsx' : 'ts',
        }
      })
    },
  }
}

/** @type {string[]} */
export const pureFunctions = [
  'Array.from',
  'Array.isArray',
  'crypto.randomUUID',
  'Date.now',
  'decodeURI',
  'decodeURIComponent',
  'document.createElement',
  'encodeURI',
  'encodeURIComponent',
  'Math.abs',
  'Math.ceil',
  'Math.floor',
  'Math.max',
  'Math.min',
  'Math.pow',
  'Math.random',
  'Math.round',
  'Number.isFinite',
  'Number.isInteger',
  'Number.isNaN',
  'Object.entries',
  'Object.hasOwn',
  'Object.keys',
  'Object.values',
  'structuredClone',
  'URLPattern',
]
