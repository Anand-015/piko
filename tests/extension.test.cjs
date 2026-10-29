const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const extensionRoot = path.resolve(__dirname, '../apps/extension');
const buildRoot = path.join(extensionRoot, 'dist');

test('production extension exposes only the side panel and bundled assets', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(buildRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '0.1.0');
  assert.deepEqual(manifest.permissions, ['sidePanel']);
  assert.equal(manifest.action.default_popup, undefined);
  for (const key of ['content_scripts', 'host_permissions', 'optional_host_permissions', 'externally_connectable']) {
    assert.equal(manifest[key], undefined, `${key} is outside the disconnected UI phase`);
  }
  assert.ok(manifest.background.service_worker);
  assert.equal(manifest.background.type, 'module');
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'self';/);
  assert.doesNotMatch(JSON.stringify(manifest), /https?:|localhost|127\.0\.0\.1/);
  for (const entry of [manifest.side_panel.default_path, manifest.background.service_worker, ...Object.values(manifest.icons)]) {
    assert.ok(fs.existsSync(path.join(buildRoot, entry)), `Missing built entry: ${entry}`);
  }
});

// This verifies configuration and rejection handling, not a real toolbar click.
for (const rejects of [false, true]) {
  test(`toolbar panel behavior handles API ${rejects ? 'failure' : 'success'}`, async () => {
    const calls = [];
    const diagnostics = [];
    const worker = fs.readFileSync(path.join(extensionRoot, 'src/background.ts'), 'utf8');
    vm.runInNewContext(worker, {
      chrome: {
        sidePanel: {
          setPanelBehavior: (options) => {
            calls.push(JSON.parse(JSON.stringify(options)));
            return rejects ? Promise.reject(new Error('private browser context')) : Promise.resolve();
          },
        },
      },
      console: { error: (...args) => diagnostics.push(args) },
    });
    await new Promise(setImmediate);
    assert.deepEqual(calls, [{ openPanelOnActionClick: true }]);
    assert.deepEqual(diagnostics, rejects ? [['PIKO_SIDE_PANEL_CONFIGURATION_FAILED']] : []);
  });
}
