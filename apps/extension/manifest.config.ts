import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'Local Voice Form Assistant',
  description: pkg.description,
  version: pkg.version,
  minimum_chrome_version: '116',
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_title: 'Open Local Voice Form Assistant',
  },
  permissions: [
    'sidePanel',
  ],
  content_security_policy: {
    extension_pages: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; connect-src 'self';",
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
})
