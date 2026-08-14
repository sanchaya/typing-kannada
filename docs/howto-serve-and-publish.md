# How to Run Locally and Publish to GitHub Pages

Serve the app for local development, then publish it as a GitHub Pages site under a custom domain. The app is plain static files, so both ends are a few commands.

## Prerequisites

- Python 3 (`python3 --version`) for the local server, or any static server (`npx serve`, VS Code Live Server).
- A GitHub repo with `git push` access for publishing.

## Run locally

### Steps

1. Open a terminal in the repo root.

   ```bash
   cd /path/to/typing-kannada
   ```

2. Start a static file server.

   ```bash
   python3 -m http.server 8080
   ```

3. Open the app.

   ```text
   http://localhost:8080
   ```

4. Pick a layout, then type in the Layout tab's surface. The board mirrors your physical keys, Shift shows the shifted layer, and the digit toggle swaps `೦-೯` for `0-9`.

### Verification

Select each of the four layouts and type `k`, `A`, `a` in the test surface. The KGP and Transliteration layouts should produce `ಕ` (or `ಕಾ`), and the practice hints should match the keys the board highlights.

### Troubleshooting

**The page shows "Could not load the layout registry".** You opened `index.html` directly via double-click (`file://`). Browsers block `fetch()` on that protocol. Serve the folder as above; on GitHub Pages this works with no extra setup.

**Port 8080 is busy.** Pick another: `python3 -m http.server 8000` and visit `http://localhost:8000`.

## Publish to GitHub Pages

### Steps

1. Push the repo's `main` branch, keeping the folder structure intact. `app.js` loads `data/layouts.json` and `data/layouts/*.json` by relative path, so the files must stay at the repo root.

   ```bash
   git push origin main
   ```

2. In the repo on GitHub: **Settings → Pages**.

3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, select `main` and folder `/ (root)`.

4. Save. GitHub publishes the site, usually within a minute or two, at `https://<username>.github.io/<repo>/`.

### Custom domain (optional)

1. Add a `CNAME` file at the repo root containing your bare domain (no protocol):

   ```text
   typekannada.sanchaya.net
   ```

2. Push it, then in **Settings → Pages** enter the same domain as the custom domain.
3. At your DNS provider, point the domain at GitHub Pages (`CNAME typekannada.sanchaya.net` → `<username>.github.io`).
4. Wait for DNS to propagate. HTTPS is enabled automatically for pages on a custom domain.

### Verification

Open your published URL and confirm the layout picker loads all four layouts. Try the Layout tab's test surface; if you ever see the registry error there, check that `data/` is committed and at the repo root.

### Troubleshooting

**Site serves a 404.** The branch/folder combination in Pages settings is wrong (often folder `/docs` was selected), or `main` has not been pushed. Re-check Settings → Pages.

**Layouts do not load on the custom domain.** The canonical URLs and sitemap assume `https://typekannada.sanchaya.net/`. If you use a different domain, update the canonical/OG tags in `index.html`, `robots.txt`, and `sitemap.xml`.

## Related

- [Layout Data Contract](../docs/reference-layout-data-contract.md) covers the data files this site serves.
- [Add a new layout](../docs/howto-add-a-layout.md) for extending the app with more layouts.