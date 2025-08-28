import { react } from '@ziloen/eslint-config'

/** @type { import("@ziloen/eslint-config").FlatESLintConfig[] } */
const config = react({
  project: ['./tsconfig.json', './tsconfig.app.json', './tsconfig.node.json'],
})

export default config
