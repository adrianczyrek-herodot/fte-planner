import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// E2E odpalamy na lokalnym dev serverze + bazie z Dockera (DATABASE_URL z .env).
dotenv.config({ quiet: true });

export default defineConfig({
  testDir: "./e2e",
  // Wspólna baza + sekwencyjne dane testowe — bez równoległości.
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "e2e",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
    },
  ],
});
