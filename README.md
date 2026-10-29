# Locus

**Save the exact passage, keep it on your computer, use it with any AI.**

Locus is a local-first research memory. While you read, you save the exact passages you'll need later. Each save keeps where it came from (title, author, date, a link back to the exact spot), so you can find it again, reopen the page at that passage, and paste it into an AI chat or a draft with its sources attached. There's no account and nothing leaves your computer.

This is my capstone project for PROG3320 at Conestoga College. It's a work in progress: right now the Chrome extension works on its own, and the Windows companion app (which adds MCP access for AI tools like Claude Desktop) comes later.

## What works today

- **Save a passage.** Select text, then right-click → *Save passage to Locus*, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>. A small card confirms the save next to the passage and lets you add a note. The saved words stay highlighted on the page.
- **Save a page.** Right-click → *Save page to Locus*, or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>.
- **Citation details.** Each save keeps the title, authors, published date, site, DOI and the nearest heading above the passage, read from the page's citation, Open Graph and JSON-LD tags.
- **Search.** The side panel (click the toolbar icon or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd>) searches passages, notes, titles and authors. Put words in `"quotes"` for an exact match.
- **Open at passage.** Reopens the page scrolled to the saved words, using URL text fragments (`#:~:text=`).
- **Copy with sources.** Tick one or more saves and copy them as numbered quotes with source lines, ready to paste into ChatGPT, Claude, Copilot or a document. The text says it's quoted material, so an AI doesn't treat it as instructions.
- **Saved copy.** Locus keeps the readable text of each page (hidden text is dropped), so you can still read a passage in context if the page changes or disappears.
- **Collections.** Pick where new saves go from the *Saving to* menu. Create, rename and delete collections in the Library tab.
- **Link warnings.** Library proxy and session links (the kind that stop working after you sign out) get a warning and a field to paste a permalink or DOI link.
- **Export and import.** The whole library as one JSON file.

## Getting started

You'll need Node.js 20 or newer and Chrome 116 or newer.

```bash
npm install
npm run build
```

Then load it in Chrome:

1. Go to `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and pick the `extension/dist` folder.
3. Pin Locus from the puzzle-piece menu so the icon is easy to reach.

While working on it, `npm run dev` rebuilds on every change. Click the reload arrow on the Locus card in `chrome://extensions` to pick up the new build, and refresh any page you're testing on.

### Tests

```bash
npm test                              # unit tests (Vitest)
cd extension
npx playwright install chromium       # first time only
npm run build && npm run test:e2e     # browser tests with the real extension loaded
```

The unit tests include two of the storage checks from the project plan: searching 1,000 passages in under a second, and exporting then importing into a fresh library without losing anything.

## How it fits together

```
extension/
  src/background/   service worker: right-click menus, shortcuts, saving
  src/content/      runs in the page only when you save: reads the selection and citation details, shows the saved card
  src/sidepanel/    React side panel: search, details, library
  src/lib/          shared logic: storage, search, text fragments, citations, link checks
  tests/unit/       Vitest
  tests/e2e/        Playwright, loads the built extension in Chromium
  design/           icon source
```

- **Stack:** React and TypeScript, Vite, Chrome Manifest V3.
- **Storage:** IndexedDB inside the extension. Nothing is sent anywhere.
- **Search:** [MiniSearch](https://github.com/lucaong/minisearch), an in-memory full-text index. Search by meaning comes later.
- **Permissions:** `activeTab` means Locus can only read a page right after you right-click or use a shortcut on it. It never reads pages in the background.

## Status and what's next

See [STATUS.md](STATUS.md) for what's unfinished, what's known to be broken, and the decisions still open.

## Author

Maharshi Pandya
