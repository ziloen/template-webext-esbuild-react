import { resolve } from 'node:path'
import process from 'node:process'

const cwd = process.cwd()

/**
 * @param {...string} args
 * @returns {string}
 */
export function r(...args) {
  return resolve(cwd, ...args)
}

export const isDev = process.env.NODE_ENV !== 'production'

export const isFirefoxEnv = process.env.EXTENSION === 'firefox'

export const isCI = process.env.CI === 'true'
