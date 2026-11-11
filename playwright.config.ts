import { defineConfig, devices } from "@playwright/test";
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5179",
    ...(executablePath
      ? { launchOptions: { executablePath } }
      : { channel: "chromium" }),
    trace: "retain-on-failure",
  },
  webServer:
    process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1"
      ? undefined
      : {
          command: "npm run dev -- --port 5179 --strictPort",
          url: "http://127.0.0.1:5179",
          reuseExistingServer: false,
          env: {
            VITE_SUPABASE_URL: "http://127.0.0.1:54321",
            VITE_SUPABASE_ANON_KEY: "sb_publishable_synthetic",
          },
        },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
