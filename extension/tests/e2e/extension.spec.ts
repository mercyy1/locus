// Loads the built extension in Chromium and walks through save → search → copy.
// Context menus and shortcuts can't be clicked from a test, so we run the same page
// script the background injects and hand its result to the background worker.
import { test as base, expect, chromium, type BrowserContext, type Worker } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve(import.meta.dirname, "../../dist");
const fixtures = resolve(import.meta.dirname, "fixtures");

type Fixtures = { context: BrowserContext; worker: Worker; extensionId: string; baseUrl: string };

const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
    });
    await use(context);
    await context.close();
  },
  worker: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    sw ??= await context.waitForEvent("serviceworker");
    await use(sw);
  },
  extensionId: async ({ worker }, use) => {
    await use(worker.url().split("/")[2]);
  },
  // eslint-disable-next-line no-empty-pattern
  baseUrl: async ({}, use) => {
    const server: Server = createServer(async (req, res) => {
      try {
        const body = await readFile(resolve(fixtures, (req.url ?? "/").slice(1).split("?")[0] || "article.html"));
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as { port: number }).port;
    await use(`http://127.0.0.1:${port}`);
    server.close();
  },
});

test("saves a passage with its source, finds it, and copies it with sources", async ({ context, worker, extensionId, baseUrl }) => {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/article.html`);
  await page.addScriptTag({ path: resolve(dist, "content.js") });

  // Select "saved about 55 minutes a day" and capture it
  const payload = await page.evaluate(() => {
    const p = document.getElementById("target")!;
    const text = p.firstChild!;
    const start = text.textContent!.indexOf("saved about");
    const end = text.textContent!.indexOf(", and most");
    const r = document.createRange();
    r.setStart(text, start);
    r.setEnd(text, end);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
    return window.__locus!.capture("passage");
  });

  expect(payload).not.toBeNull();
  expect(payload!.text).toBe("saved about 55 minutes a day");
  expect(payload!.heading).toBe("What people did with the time");
  expect(payload!.source.title).toBe("How remote work changed commuting");
  expect(payload!.source.authors).toEqual(["Priya Shah"]);
  expect(payload!.source.publishedDate).toBe("2026-09-14");
  // hidden text shouldn't make it into the saved copy
  expect(payload!.pageText).not.toContain("Ignore previous instructions");

  const saved = await worker.evaluate(
    // @ts-expect-error locusDebug is attached to the worker's global
    (p) => globalThis.locusDebug.storeCapture(p),
    payload,
  );
  expect(saved.fragmentUrl).toContain("#:~:text=");

  // The exact-spot link should land on the passage, far down the page
  const reopened = await context.newPage();
  await reopened.goto(saved.fragmentUrl);
  await expect
    .poll(() => reopened.evaluate(() => {
      const r = document.getElementById("target")!.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    }))
    .toBe(true);

  // Side panel: it's a normal extension page, so open it in a tab
  const panel = await context.newPage();
  // Headless Chrome won't grant clipboard access to extension pages, so catch what gets copied
  await panel.addInitScript(() => {
    navigator.clipboard.writeText = async (t: string) => {
      (window as unknown as { copied: string }).copied = t;
    };
  });
  await panel.setViewportSize({ width: 400, height: 760 });
  await panel.goto(`chrome-extension://${extensionId}/sidepanel/index.html`);
  await expect(panel.getByText("saved about 55 minutes a day")).toBeVisible();
  await panel.screenshot({ path: "test-results/sidepanel-list.png" });

  await panel.getByLabel("Search your saves").fill("minutes");
  await expect(panel.locator("mark", { hasText: "minutes" })).toBeVisible();

  await panel.getByLabel("Search your saves").fill('"55 hours"');
  await expect(panel.getByText("No saves match that")).toBeVisible();
  await panel.getByLabel("Search your saves").fill("");

  await panel.getByRole("checkbox").first().check();
  await panel.getByRole("button", { name: "Copy with sources" }).click();
  await expect(panel.getByText("Copied with its source")).toBeVisible();
  const clip = await panel.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(clip).toContain('[1] "saved about 55 minutes a day"');
  expect(clip).toContain('Priya Shah. "How remote work changed commuting." The Daily Example, Sep 14, 2026.');

  await panel.getByText("saved about 55 minutes a day").click();
  await expect(panel.getByRole("button", { name: "Open at passage" })).toBeVisible();
  await panel.screenshot({ path: "test-results/sidepanel-detail.png" });

  await panel.getByRole("button", { name: "Read the saved copy" }).click();
  await expect(panel.locator(".snapshot mark")).toHaveText("saved about 55 minutes a day");
});

test("shows the saved card on the page", async ({ context, baseUrl }) => {
  const page = await context.newPage();
  await page.goto(`${baseUrl}/article.html`);
  await page.addScriptTag({ path: resolve(dist, "content.js") });
  await page.evaluate(() => {
    const p = document.getElementById("target")!;
    p.scrollIntoView({ block: "center" });
    const r = document.createRange();
    r.selectNodeContents(p);
    window.getSelection()!.addRange(r);
    window.__locus!.capture("passage");
    window.__locus!.showSaved({ id: "x", collectionName: "Unsorted", limited: false, kind: "passage" });
  });
  await expect(page.locator("#locus-saved-card")).toBeAttached();
  await page.screenshot({ path: "test-results/saved-card.png" });
});

test("creates a collection and saves into it", async ({ context, worker, extensionId }) => {
  const panel = await context.newPage();
  await panel.setViewportSize({ width: 400, height: 760 });
  await panel.goto(`chrome-extension://${extensionId}/sidepanel/index.html`);
  await expect(panel.getByText("Nothing saved yet")).toBeVisible();

  await panel.getByRole("tab", { name: "Library" }).click();
  await panel.getByLabel("New collection name").fill("PSYC 2010 essay");
  await panel.getByRole("button", { name: "Add" }).click();
  await expect(panel.getByRole("button", { name: /PSYC 2010 essay/ })).toBeVisible();

  const id = await panel.locator("select").first().evaluate((s: HTMLSelectElement) =>
    Array.from(s.options).find((o) => o.text === "PSYC 2010 essay")!.value,
  );
  await panel.locator("select").first().selectOption(id);

  await worker.evaluate(
    // @ts-expect-error locusDebug is attached to the worker's global
    (p) => globalThis.locusDebug.storeCapture(p),
    { kind: "passage", text: "A passage for the essay.", source: { url: "https://example.org/a", title: "Essay source", authors: [] } },
  );
  await expect(panel.getByRole("button", { name: /PSYC 2010 essay\s*1/ })).toBeVisible();
  await panel.screenshot({ path: "test-results/sidepanel-library.png" });
});
