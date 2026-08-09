# ಕೀಲಿಕನ್ನಡ — Kannada Typing Tutor

An interactive typing tutor built directly from the [KPRao/KGP/Nudi](https://github.com/sanchaya/KPRao-KGP-Keyboard-Layout-for-Mac) macOS keyboard layout. Practise on your own physical keyboard, watch a virtual keyboard light up, and build typing speed — no installation of the actual keyboard layout required.

**Live structure** (plain static files, no build step, no dependencies):

```
index.html              — page markup
style.css                — all styling
app.js                    — keyboard engine + tutor logic
data/kannada_layout.json  — key mappings extracted from the .keylayout file
```

## Publish on GitHub Pages

1. Push these four files/folders to a repo (keep the folder structure as-is — `app.js` fetches `data/kannada_layout.json` by relative path).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, pick your branch (usually `main`) and folder `/ (root)`.
4. Save. GitHub will give you a URL like `https://<username>.github.io/<repo>/` within a minute or two.

That's the whole setup — everything here is static HTML/CSS/JS, so there's no server, no npm install, no build step.

## Running it locally before you push

Opening `index.html` directly by double-clicking (`file://…`) will **not** work, because `app.js` loads `data/kannada_layout.json` via `fetch()`, which browsers block on the `file://` protocol. Serve the folder instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or any equivalent static server (`npx serve`, VS Code's Live Server extension, etc).

## What's inside

- **Layout tab** — the full virtual keyboard (base + Shift layer legends), with a live test box that mirrors your physical keyboard as you type.
- **Practice tab** — a 5-level typing tutor (vowels → consonants → consonant+vowel combinations → words → sentences) with WPM, accuracy, and streak tracking.
- **Free Type tab** — an open canvas with grapheme-aware Backspace (removes one full akshara at a time). Spelling/grammar checking is flagged here as the next milestone, not yet implemented.
- **Review Notes tab** — an audit of the source `.keylayout` file: a couple of malformed-XML bugs, some dead code, an incomplete feature, and a coverage gap, alongside what's verified sound. Worth fixing in the original `.keylayout` before it's recompiled into a public installer — see that tab for specifics and line references.

## Editing the keyboard data

`data/kannada_layout.json` is a plain extraction of the `.keylayout` file's `keyMap`, `actions`, and `terminators` tables (only the standard US-ANSI printable keys, codes 0–53). If the underlying `.keylayout` changes, re-extract this JSON rather than hand-editing it — see the Review Notes tab for the two known bugs in the original file that this JSON already has patched (`&x200c;` / `&x200D;` → proper `&#x200c;` / `&#x200D;`).
