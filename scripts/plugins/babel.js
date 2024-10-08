import { transform } from '@babel/core'
import fs from 'fs-extra'

/**
 * @import { TransformOptions } from "@babel/core"
 */

/** @type {import("babel-plugin-annotate-module-pure").Options["pureCalls"]} */
const PURE_CALLS = {
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
  'webextension-polyfill': [
    ['tabs', 'query'],
    ['i18n', 'detectLanguage'],
    ['runtime', 'getManifest'],
    ['runtime', 'getURL'],
    ['default', 'tabs', 'query'],
    ['default', 'i18n', 'detectLanguage'],
    ['default', 'runtime', 'getManifest'],
    ['default', 'runtime', 'getURL'],
  ],
  'lodash-es': [
    'clone',
    'debounce',
    'isEmpty',
    'isEqual',
    'isFunction',
    'isPlainObject',
    'memoize',
    'noop',
    'throttle',
  ],
  rxjs: ['fromEventPattern', 'share'],
  'rxjs/operators': ['share'],
  'serialize-error': ['deserializeError', 'serializeError'],
  clsx: ['default', 'clsx'],
  'clsx/lite': ['default', 'clsx'],
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
      // ['react-refresh/babel', { skipEnvCheck: true }],
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
      build.onLoad({ filter: /\.tsx?$/ }, async args => {
        const code = await fs.readFile(args.path, 'utf-8')
        return {
          contents: await transformContents(code),
          loader: args.path.endsWith('x') ? 'tsx' : 'ts',
        }
      })
    },
  }
}

export const pure = [
  'Array.from',
  'Array.isArray',
  'Date.now',
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
  'crypto.randomUUID',
  'decodeURI',
  'decodeURIComponent',
  'document.createElement',
  'encodeURI',
  'encodeURIComponent',
]
