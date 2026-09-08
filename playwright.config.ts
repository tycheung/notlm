import { defineConfig, devices } from '@playwright/test';

const demoTodoPort = 5173;
const demoCrmPort = 5174;
const demoHelloPort = 5175;
const demoTodoBaseURL = `http://127.0.0.1:${demoTodoPort}`;
const demoCrmBaseURL = `http://127.0.0.1:${demoCrmPort}`;
const demoHelloBaseURL = `http://127.0.0.1:${demoHelloPort}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'demo-todo',
      testMatch: /demo-todo.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: demoTodoBaseURL,
      },
    },
    {
      name: 'demo-crm',
      testMatch: /demo-crm.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: demoCrmBaseURL,
      },
    },
    {
      name: 'demo-hello',
      testMatch: /demo-hello.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: demoHelloBaseURL,
      },
    },
    {
      name: 'demo-todo-firefox',
      testMatch: /demo-todo-coach\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        baseURL: demoTodoBaseURL,
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -w @uipilot/demo-todo',
      url: demoTodoBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npm run dev -w @uipilot/demo-crm',
      url: demoCrmBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npm run dev -w @uipilot/demo',
      url: demoHelloBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
