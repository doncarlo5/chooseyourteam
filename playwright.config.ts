import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  testMatch: "**/*.visual.ts",
  // Concurrent Skia/WebGL pages can lose their Canvas on this test host.
  // Serialize visual tests rather than hiding missing renders with retries.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:8083",
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
  },
  webServer: {
    command:
      "CI=1 EXPO_PUBLIC_VISUAL_TEST_MODE=1 npx expo start --web --port 8083",
    url: "http://127.0.0.1:8083",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
