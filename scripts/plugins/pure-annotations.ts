import type { NodePath, TransformOptions } from '@babel/core'
import { transform } from '@babel/core'
import type { CallExpression, Identifier, Node } from '@babel/types'
import { addComment, isIdentifier } from '@babel/types'
import type { Plugin } from 'esbuild'
import fs from 'fs-extra'

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
    ['runtime', 'getURL'],
    ['runtime', 'getManifest'],
    ['default', 'runtime', 'getURL'],
    ['default', 'runtime', 'getManifest'],
  ],
  'lodash-es': [
    'clone',
    'debounce',
    'isEmpty',
    'isEqual',
    'isFunction',
    'isPlainObject',
    'memoize',
    'mergeWith',
    'noop',
    'throttle',
  ],
}

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
        return { contents: await transformContents(code), loader: 'tsx' }
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
        methods.includes(calleePath.node.name) &&
        calleePath.referencesImport(module, calleePath.node.name)
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
          if (index === 0) return true
          return allProperties[index]?.node.name === method
        })
      ) {
        const firstProp = allProperties[0]
        if (!firstProp) continue
        const firstMethod = method[0]
        if (!firstMethod) continue

        const binding = firstProp.scope.getBinding(firstProp.node.name)
        if (!binding || binding.kind !== 'module') continue

        const path = binding.path
        const parent = path.parentPath

        if (!parent || !parent.isImportDeclaration()) continue

        if (parent.node.source.value !== module) continue

        if (path.isImportDefaultSpecifier() && firstMethod === 'default') {
          return true
        }

        if (path.isImportNamespaceSpecifier() && firstMethod === '*') {
          return true
        }

        if (
          path.isImportSpecifier() &&
          isIdentifier(path.node.imported, { name: firstMethod })
        ) {
          return true
        }

        continue
      }
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
