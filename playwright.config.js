// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const TEST_DB = path.join(__dirname, 'FuturoZ_test.db');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  // Run tests serially in one worker to keep DB state predictable
  workers: 1,
  fullyParallel: false,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `node server.js`,
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 15_000,
    env: {
      DB_PATH: TEST_DB,
      PORT: '3000',
      // Disable real Gemini calls – services.js returns mock data when key is missing
      GEMINI_API_KEY: 'sua_chave_aqui',
    },
  },
});
