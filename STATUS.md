# Status

Last updated: 29 Oct 2026

The extension covers most of milestone 1 in the build plan (capture, storage and keyword search inside the extension), plus early pieces of weeks 5–8 (exact-spot links, citation details, the link warning) and Copy with sources.

## Not built yet

- **PDF support.** In Chrome's built-in PDF viewer, Locus can only save the selected text and the PDF's URL (marked *Text only*). No page numbers or exact-spot links yet. The plan is a Locus PDF viewer built on PDF.js (weeks 9–12).
- **Search by meaning.** Only keyword search so far. Embeddings with Transformers.js come later.
- **Windows companion and MCP connector.** Nothing yet. The storage layer (`src/lib/db.ts`) is kept small so the companion can take over as the main store later.
- **Ask.** The tab is there but switched off. It's last in the build order.
- **Welcome / setup screen** from the wireframes.
- **Highlights on return visits.** Saved passages are highlighted right after saving, but not when you come back to the page later. That needs the extension to read every page you visit, which goes against using `activeTab` only.
- **Editing a passage's text** after saving.
- **Storage test on real machines.** The plan's pass rule needs 1,000 saves to survive browser restarts, a computer restart and an extension update, on Windows and macOS. The unit tests cover search speed and export/import, but the restart checks have to be done by hand.

## Known issues

- **"Save this page" in the side panel doesn't work on its own.** Chrome doesn't treat a click inside the side panel as invoking the extension, so `activeTab` isn't granted ([Chromium extensions group thread](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/DET2SXCFnDg)). The button now explains to use right-click or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> instead. See the open decision below.
- **Pressing the shortcut with nothing selected** only shows an amber "!" on the toolbar icon, with no message on the page.
- **Exact-spot links can miss** if the page changes, or if the passage spans very different parts of the page (like a table and a paragraph). The page then opens at the top, and the saved copy still has the passage.
- **Not tested in the real context menu / shortcut flow by automation.** The browser tests run the same page script and background code, but Playwright can't click Chrome's right-click menu. A quick manual pass is worth doing after loading the extension.

