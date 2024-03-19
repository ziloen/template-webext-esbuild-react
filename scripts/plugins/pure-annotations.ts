import type { NodePath, TransformOptions } from '@babel/core'
import { transform } from '@babel/core'
import type { CallExpression, Identifier, Node } from '@babel/types'
import { addComment, isIdentifier } from '@babel/types'
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
export function pureAnnotations(): Plugin {
  const config: TransformOptions = {
    parserOpts: {
      plugins: ['jsx', 'typescript'],
    },
    plugins: [
      {
        name: 'pure-annotations',
        visitor: {
          CallExpression(path) {
            if (isPureCall(path)) {
              annotateAsPure(path)
            }
          },
        },
      },
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
    name: 'pure-annotations',
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

/**
 * Check if the call expression is maked as pure in the PURE_CALLS list.
 * 1. import { method } from "module"; method()
 * 2. import { object } from "module"; object.path.to.method()
 * 3. import * as object from "module"; object.path.to.method()
 * 4. import object from "module"; object.path.to.method()
 * 5. import { object as alias } from "module"; alias.path.to.method()
 */
function isPureCall(path: NodePath<CallExpression>): boolean {
  const calleePath = path.get('callee')

  if (calleePath.isIdentifier()) {
    for (const [module, methods] of Object.entries(PURE_CALLS)) {
      if (
        isReferencesImport(
          calleePath,
          module,
          methods.filter((m): m is string => typeof m === 'string')
        )
      ) {
        return true
      }
    }

    return false
  }

  const allProperties: NodePath<Identifier>[] = []
  if (calleePath.isMemberExpression() && !calleePath.node.computed) {
    let objPath = calleePath

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const propPath = objPath.get('property')
      const nextObjPath = objPath.get('object')

      if (!propPath.isIdentifier()) {
        return false
      }

      if (nextObjPath.isIdentifier()) {
        allProperties.unshift(propPath)
        allProperties.unshift(nextObjPath)
        break
      }

      if (nextObjPath.isMemberExpression() && !nextObjPath.node.computed) {
        allProperties.unshift(propPath)
        objPath = nextObjPath
        continue
      }

      return false
    }
  }

  if (allProperties.length === 0) return false

  for (const [module, methods] of Object.entries(PURE_CALLS)) {
    for (const method of methods) {
      if (typeof method === 'string') continue

      if (
        method.every((method, index) => {
          // Skip the first property, it could be an alias or a default import
          // it will be checked later in isReferencesImport
          if (index === 0) return true
          return allProperties[index]?.node.name === method
        })
      ) {
        const firstProp = allProperties[0]
        if (!firstProp) continue
        const firstMethod = method[0]
        if (!firstMethod) continue

        if (isReferencesImport(firstProp, module, firstMethod)) {
          return true
        } else {
          continue
        }
      }
    }
  }

  return false
}

/**
 * https://github.com/babel/babel/blob/main/packages/babel-traverse/src/path/introspection.ts#L191
 */
function isReferencesImport(
  nodePath: NodePath<Identifier>,
  moduleSource: string,
  importedName: string | string[]
) {
  const binding = nodePath.scope.getBinding(nodePath.node.name)
  if (!binding || binding.kind !== 'module') return false

  const parent = binding.path.parentPath
  if (!parent || !parent.isImportDeclaration()) return false
  if (parent.node.source.value !== moduleSource) return false

  const path = binding.path

  if (path.isImportDefaultSpecifier() && importedName === 'default') return true

  if (path.isImportNamespaceSpecifier() && importedName === '*') return true

  if (path.isImportSpecifier()) {
    for (const name of Array.isArray(importedName)
      ? importedName
      : [importedName]) {
      if (isIdentifier(path.node.imported, { name })) return true
    }
  }

  return false
}

function annotateAsPure(pathOrNode: Node | NodePath): void {
  const node =
    // @ts-expect-error Node will not have `node` property
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (pathOrNode['node'] || pathOrNode) as Node
  if (isPureAnnotated(node)) {
    return
  }
  addComment(node, 'leading', PURE_ANNOTATION)
}

const PURE_ANNOTATION = '#__PURE__'

const isPureAnnotated = ({ leadingComments }: Node): boolean =>
  !!leadingComments &&
  leadingComments.some(comment => /[@#]__PURE__/.test(comment.value))
