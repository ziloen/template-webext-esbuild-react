import { react } from '@ziloen/eslint-config'

/** @type { import("@ziloen/eslint-config").FlatESLintConfig[] } */
export default [
  ...react({
    project: ['./src/tsconfig.json', './tsconfig.json'],
  }),
  {
    ignores: ['**/scripts'],
  },
]
