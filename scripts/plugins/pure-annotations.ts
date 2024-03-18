import type { NodePath } from '@babel/core'
import type { CallExpression, Identifier, Node } from '@babel/types'
import { addComment, isIdentifier } from '@babel/types'
import babelPlugin from '@chialab/esbuild-plugin-babel'

const PURE_CALLS: Record<string, (string | string[])[]> = {
  react: [
    'cloneElement',
    'createContext',
    'createElement',
    'createFactory',
    'createRef',
    'forwardRef',
    'isValidElement',
    'memo',
    'lazy',
  ],
  'react-dom': ['createPortal'],
  'webextension-polyfill': [
    ['runtime', 'getURL'],
    ['default', 'runtime', 'getURL'],
  ],
}

export function pureAnnotations() {
  return babelPlugin({
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
  })
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
  const importIdentifierPath = getImportIdentifierPath(path)

  return importIdentifierPath !== null
}

function getImportIdentifierPath(path: NodePath<CallExpression>) {
  const calleePath = path.get('callee')

  if (calleePath.isIdentifier()) {
    for (const [module, methods] of Object.entries(PURE_CALLS)) {
      if (
        methods.includes(calleePath.node.name) &&
        calleePath.referencesImport(module, calleePath.node.name)
      ) {
        return calleePath
      }
    }

    return null
  }

  const allProperties: NodePath<Identifier>[] = []
  if (calleePath.isMemberExpression() && !calleePath.node.computed) {
    let objPath = calleePath

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const propPath = objPath.get('property')
      const nextObjPath = objPath.get('object')

      if (!propPath.isIdentifier()) {
        return null
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

      return null
    }
  }

  if (allProperties.length === 0) return null

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
          return firstProp
        }

        if (path.isImportNamespaceSpecifier() && firstMethod === '*') {
          return firstProp
        }

        if (
          path.isImportSpecifier() &&
          isIdentifier(path.node.imported, { name: firstMethod })
        ) {
          return firstProp
        }

        continue
      }
    }
  }

  return null
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
