import corejsPkg from 'core-js/package.json' with { type: 'json' }

import presetEnv from '@babel/preset-env'
import { stringLiteral } from '@babel/types'
import babelPlugin from '@rolldown/plugin-babel'
import annotateModulePure from 'babel-plugin-annotate-module-pure'
import { clsx } from 'cn/lite'
import { difference } from 'es-toolkit'
import { target } from '../utils.js'

/** @type {import("babel-plugin-annotate-module-pure").Options["pureFunctions"]} */
const modulePureFunctions = {
  axios: [['default', 'create']],
  classnames: ['default'],
  clsx: ['default', 'clsx'],
  'clsx/lite': ['default', 'clsx'],
  cn: ['clsx'],
  'cn/lite': ['clsx'],
  'es-toolkit': ['clamp', 'mapValues', 'noop'],
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
    'noop',
    'pickBy',
    'throttle',
  ],
  'mobx-react': ['observer'],
  'mobx-react-lite': ['observer'],
  motion: ['MotionValue'],
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
  zustand: ['create'],
  'zustand/middleware': ['combine'],
}

/**
 * @returns {Promise<import("rolldown").Plugin>}
 */
export function babel() {
  return babelPlugin({
    targets: target,
    // Replaces `loose: true` in preset-env (removed in Babel 8).
    // See: https://babeljs.io/docs/assumptions#migrating-from-babelpreset-envs-loose-and-spec-modes
    assumptions: {
      arrayLikeIsIterable: true,
      constantReexports: true,
      ignoreFunctionLength: true,
      ignoreToPrimitiveHint: true,
      mutableTemplateObject: true,
      noClassCalls: true,
      noDocumentAll: true,
      objectRestNoSymbols: true,
      privateFieldsAsProperties: true,
      pureGetters: true,
      setClassMethods: true,
      setComputedProperties: true,
      setPublicClassFields: true,
      setSpreadProperties: true,
      skipForOfIteratorClosing: true,
      superIsCallableConstructor: true,
    },
    plugins: [
      // Precompute pure `clsx` calls
      () => ({
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

            path.replaceWith(stringLiteral(clsx(...classNames)))
          },
        },
      }),
      [
        annotateModulePure,
        /** @satisfies {import("babel-plugin-annotate-module-pure").Options} */ ({
          pureFunctions: modulePureFunctions,
        }),
      ],
      [
        'babel-plugin-polyfill-corejs3',
        {
          method: 'usage-global',
          version: corejsPkg.version,
          proposals: false,
        },
      ],
    ],
    presets: [
      [
        presetEnv,
        /** @satisfies {import("@babel/preset-env").Options} */ ({
          modules: false,
          debug: false,
          // Required by `loose: true` migration — excludes typeof-symbol transform.
          exclude: ['transform-typeof-symbol'],
        }),
      ],
    ],
  })
}

/** @type {string[]} */
export const pureFunctions = difference(
  [
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
    'Object.hasOwn',
    'structuredClone',
    'URLPattern',
  ],
  // 有些库会使用这些函数来产生副作用，不能算作纯函数
  ['Array.from', 'Object.entries', 'Object.keys', 'Object.values'],
)
