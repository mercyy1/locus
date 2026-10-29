// Builds the extension into dist/. Pass --watch to rebuild on changes.
import { build } from "vite";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");
const outDir = resolve(root, "dist");

await rm(outDir, { recursive: true, force: true });

// Side panel + background worker
const app = build({
  configFile: resolve(root, "vite.config.ts"),
  build: { watch: watch ? {} : null },
});

// Page script: one self-contained file the background injects with chrome.scripting
const content = build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: false,
    target: "chrome116",
    sourcemap: false,
    watch: watch ? {} : null,
    lib: {
      entry: resolve(root, "src/content/capture.ts"),
      formats: ["iife"],
      name: "LocusCapture",
      fileName: () => "content.js",
    },
  },
});

await Promise.all([app, content]);
if (!watch) console.log("\nBuilt to dist/. Load that folder in chrome://extensions (Developer mode → Load unpacked).");
