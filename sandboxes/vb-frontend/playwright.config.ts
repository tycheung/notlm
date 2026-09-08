import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const configDir = path.dirname(fileURLToPath(import.meta.url));

function resolveBackendRoot(): string {
  const fromEnv = process.env.PLAYWRIGHT_BACKEND_ROOT;
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  const candidates = [
    path.resolve(configDir, '../fastapi-backend'),
    path.resolve(configDir, '../backend'),
    path.resolve(configDir, 'backend'),
  ];
  const found = candidates.find((dir) =>
    fs.existsSync(path.join(dir, 'scripts', 'run_e2e_api.py'))
  );
  return found ?? candidates[0];
}

const backendRoot = resolveBackendRoot();
const hasBackend = fs.existsSync(path.join(backendRoot, 'scripts', 'run_e2e_api.py'));
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const apiUrl = process.env.VITE_API_URL || process.env.PW_E2E_API_URL || 'http://127.0.0.1:8000';
const grep = process.env.PLAYWRIGHT_GREP ? new RegExp(process.env.PLAYWRIGHT_GREP) : undefined;

process.env.PW_E2E_TD_EMAIL ??= 'e2e.td@example.com';
process.env.PW_E2E_TD_PASSWORD ??= 'e2e-password-123';
process.env.PW_E2E_API_URL ??= apiUrl;
process.env.VITE_API_URL ??= apiUrl;

const apiCommand = 'poetry run python scripts/run_e2e_api.py';

// Pure NLU corpus does not need API/Vite — skip webServer unless forced live.
const guideNluOnly =
  process.argv.some((a) => a.includes('director-guide-nlu')) ||
  process.env.PLAYWRIGHT_GUIDE_NLU_ONLY === '1';
if (guideNluOnly && process.env.PLAYWRIGHT_SKIP_WEBSERVER == null) {
  process.env.PLAYWRIGHT_SKIP_WEBSERVER = '1';
}

if (!process.env.PLAYWRIGHT_SKIP_WEBSERVER && !hasBackend) {
  throw new Error(
    `Playwright live e2e needs fastapi-backend at ${backendRoot} ` +
      `(clone as ../backend or ./backend, or set PLAYWRIGHT_BACKEND_ROOT).`
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  reporter: process.env.CI ? 'github' : 'list',
  grep,
  use: {
    baseURL,
    trace: 'on-first-retry',
    extraHTTPHeaders:
      process.env.PLAYWRIGHT_STAGING_HEADER === '1'
        ? { 'aws-cf-cd-staging': '1' }
        : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: apiCommand,
          cwd: backendRoot,
          url: `${apiUrl}/health`,
          reuseExistingServer: false,
          timeout: 180_000,
          env: {
            ...process.env,
            PLAYWRIGHT_FRONTEND_ROOT: configDir,
          },
        },
        {
          command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            ...process.env,
            VITE_API_URL: apiUrl,
            VITE_LIVE_SCORES_CDN: '1',
          },
        },
      ],
});
