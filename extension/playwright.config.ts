import { defineConfig } from "@playwright/test";

// Browser tests load the built extension (run `npm run build` first)
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  workers: 1,
  reporter: "list",
});
