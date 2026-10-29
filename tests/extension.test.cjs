const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const extensionRoot = path.resolve(__dirname, '../apps/extension');
const buildRoot = path.join(extensionRoot, 'dist');

test('production extension has only user-initiated scanner permissions and bundled assets', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(buildRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, require('../apps/extension/package.json').version);
  assert.deepEqual(manifest.permissions, ['sidePanel', 'activeTab', 'scripting']);
  assert.equal(manifest.action.default_popup, undefined);
  for (const key of ['content_scripts', 'host_permissions', 'optional_host_permissions', 'externally_connectable']) {
    assert.equal(manifest[key], undefined, `${key} is outside the disconnected UI phase`);
  }
  assert.ok(manifest.background.service_worker);
  assert.equal(manifest.background.type, 'module');
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'self';/);
  assert.equal(manifest.host_permissions, undefined);
  assert.ok(fs.existsSync(path.join(buildRoot, 'src/content/form-scanner.js')));
  const scanner = fs.readFileSync(path.join(buildRoot, 'src/content/form-scanner.js'), 'utf8');
  assert.doesNotMatch(scanner, /import\s*\(|https?:\/\/|fetch\(/);
  for (const entry of [manifest.side_panel.default_path, manifest.background.service_worker, ...Object.values(manifest.icons)]) {
    assert.ok(fs.existsSync(path.join(buildRoot, entry)), `Missing built entry: ${entry}`);
  }
});
