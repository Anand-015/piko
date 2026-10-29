const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '*.browser.spec.cjs',
  timeout: 45_000,
  workers: 1,
  reporter: 'list',
});
