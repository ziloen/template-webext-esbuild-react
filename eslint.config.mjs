import { react } from '@ziloen/eslint-config'

/** @type { import("@ziloen/eslint-config").FlatESLintConfig[] } */
export default [
  ...react({ tsconfigPath: ['./src/tsconfig.json', './tsconfig.json'] }),
]
