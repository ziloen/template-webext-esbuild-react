import chalk from 'chalk'
import fsExtra from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import { commitShortHash, isCI, isDev, isFirefoxEnv, r } from './utils.js'

type ChromiumPermissions = 'sidePanel'
type Permissions =
  | Manifest.PermissionNoPrompt
  | Manifest.OptionalPermission
  | ChromiumPermissions

type OptionalPermissions = Manifest.OptionalPermission
type MV2Keys = 'browser_action' | 'user_scripts' | 'page_action'

type ChromiumManifest = {
  side_panel?: {
    default_path: string
  }
  update_url?: string
}

type StrictManifest = {
  permissions?: Permissions[]
  optional_permissions?: OptionalPermissions[]
}

type MV3 = Omit<Manifest.WebExtensionManifest, MV2Keys | keyof StrictManifest> &
  ChromiumManifest &
  StrictManifest

function generateManifest() {
  const manifest: MV3 = {
    version: '0.0.0.1',
    manifest_version: 3,
    name: 'Template WebExt Esbuild React',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    background: isFirefoxEnv
      ? { scripts: ['./background/main.js'], type: 'module' }
      : { service_worker: './background/main.js', type: 'module' },
    permissions: ['sidePanel'],
    optional_permissions: [],

    action: { default_popup: './pages/popup/index.html' },
    // devtools_page: './devtools/index.html',
    options_ui: {
      page: './pages/options/index.html',
      open_in_tab: true,
    },
    side_panel: {
      default_path: './pages/sidebar/index.html',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['./content-scripts/main.js'],
        css: ['global-rules.css'],
        run_at: 'document_end',
      },
    ],
    web_accessible_resources: [
      {
        resources: ['assets/*', 'common.css', 'global-rules.css', '**/*.map'],
        matches: ['<all_urls>'],
      },
    ],
  }

  if (isFirefoxEnv) {
    manifest.browser_specific_settings = {
      gecko: {
        id: '@extension-name.developer-name',
        strict_min_version: '140.0',
      },
      gecko_android: {
        strict_min_version: '140.0',
      },
    }

    if (manifest.side_panel) {
      manifest.sidebar_action = {
        default_panel: manifest.side_panel.default_path,
      }

      delete manifest.side_panel
    }

    if (manifest.permissions) {
      manifest.permissions = manifest.permissions.filter(
        (p) => p !== 'sidePanel',
      )
    }
  } else {
    // sidePanel: Chrome 114+
    manifest.minimum_chrome_version = '114'
  }

  if (isCI) {
    manifest.version_name =
      manifest.version + `-${commitShortHash}-${new Date().toISOString()}`
    manifest.name += ' (Nightly)'

    // if (isFirefoxEnv) {
    //   manifest.browser_specific_settings.gecko.update_url = ""
    // } else {
    //   manifest.update_url = ""
    // }
  }

  return manifest
}

console.log(chalk.gray('write'), chalk.hex('#d19a66')('manifest.json'))
fsExtra.writeJSONSync(r('dist/dev/manifest.json'), generateManifest(), {
  spaces: 2,
})
