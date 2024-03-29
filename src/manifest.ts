import type { Manifest } from 'webextension-polyfill'
import { isDev, isFirefoxEnv } from '../scripts/utils.mjs'

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
}

type StrictManifest = {
  permissions?: Permissions[]
  optional_permissions?: OptionalPermissions[]
}

type MV3 = Omit<Manifest.WebExtensionManifest, MV2Keys | keyof StrictManifest> &
  ChromiumManifest &
  StrictManifest

export function getManifest() {
  const manifest: MV3 = {
    version: '0.0.0.1',
    manifest_version: 3,
    name: 'Template WebExt Esbuild React',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    background: isFirefoxEnv
      ? { scripts: ['./background/mian.js'], type: 'module' }
      : { service_worker: './background/main.js', type: 'module' },
    permissions: ['sidePanel'],
    optional_permissions: [],

    action: {
      default_popup: './pages/popup/index.html',
    },
    devtools_page: './devtools/index.html',
    options_ui: {
      page: './pages/options/index.html',
      open_in_tab: true,
    },
    side_panel: {
      default_path: './pages/sidebar/index.html',
    },
  }

  if (isFirefoxEnv) {
    manifest.browser_specific_settings = {
      gecko: {
        id: '[ID]',
        strict_min_version: '115.0',
      },
    }
  } else {
    manifest.minimum_chrome_version = '100'
  }

  return manifest
}
