import { resolve } from 'node:path'

const cwd = process.cwd()

/**
 * @param {...string} args
 */
export function r(...args) {
  return resolve(cwd, ...args)
}
export const isDev = process.env.NODE_ENV !== 'production'
export const isFirefoxEnv = process.env.EXTENSION === 'firefox'
