import fs from 'fs-extra'
import { getManifest } from '../src/manifest'
import { r } from './utils'

function writeManifest() {
  fs.writeJSONSync(r('dist/dev/manifest.json'), getManifest(), { spaces: 2 })
}

writeManifest()
