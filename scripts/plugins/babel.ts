import type { TransformOptions } from '@babel/core'
import { transform } from '@babel/core'
import type { Plugin } from 'esbuild'
import fs from 'fs-extra'

// https://github.com/babel/babel/blob/main/packages/babel-plugin-transform-react-pure-annotations/src/index.ts

const PURE_CALLS: Record<string, (string | string[])[]> = {
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
 */
export function esbuildBabel(): Plugin {
  const config: TransformOptions = {
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
    ],
  }

  function transformContents(code: string) {
    return new Promise<string>((resolve, reject) => {
      transform(code, config, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result!.code!)
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
