const { test, expect, chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

test('unpacked extension starts its worker and renders the offline panel', async ({}, testInfo) => {
  const extensionPath = path.resolve(__dirname, '../apps/extension/dist');
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8'));
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    executablePath: process.env.PIKO_CHROMIUM_PATH || undefined,
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    const externalRequests = [];
    await context.route(/^https?:/, (route) => {
      externalRequests.push(route.request().url());
      return route.abort();
    });
    const worker = context.serviceWorkers()[0]
      || await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).hostname;
    await expect.poll(() => worker.evaluate(() => chrome.sidePanel.getPanelBehavior()))
      .toEqual({ openPanelOnActionClick: true });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`chrome-extension://${extensionId}/${manifest.side_panel.default_path}`);
    await expect(page.getByRole('heading', { name: 'Local Voice Form Assistant', exact: true }))
      .toBeVisible();
    await expect(page.getByText(/Local AI runtime not connected yet/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Voice assistance coming later' })).toBeDisabled();

    for (const width of [280, 360, 480]) {
      await page.setViewportSize({ width, height: 800 });
      await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth,
      )).toBe(true);
      if (width === 360) {
        await page.screenshot({ path: testInfo.outputPath('sidepanel.png'), fullPage: true });
      }
    }
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
  } finally {
    await context.close();
  }
});
