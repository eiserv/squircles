import { defineConfig } from "@playwright/test";
import process from "node:process";

export default defineConfig({
  testDir: "./browser-tests",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:5173", browserName: "chromium" },
  webServer: {
    command: "node scripts/serve-playground.mjs",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
