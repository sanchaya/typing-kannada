# ಕೀಲಿಕನ್ನಡ - Kannada Typing Tutor

An interactive typing tutor for four real Kannada layouts. Practise on your own physical keyboard, watch a virtual keyboard light up, and build typing speed - no installation of the actual keyboard layout required.

**Included layouts:**

| Layout | Type | What it is |
| --- | --- | --- |
| ಕೆಜಿಪಿ (kgp) | keymap | The KPRao/KGP/Nudi family - type by sound (`k→ಕ`, `A→ಾ`, `f→್`). Built directly from the [KPRao/KGP macOS keyboard layout](https://github.com/sanchaya/KPRao-KGP-Keyboard-Layout-for-Mac). |
| InScript (inscript) | rule-based | The Government of India standard position-based layout. |
| InScript 2 (inscript2) | rule-based | The updated InScript standard with conjunct and ZWJ/ZWNJ shortcuts on a modifier layer. |
| Transliteration (transliteration) | rule-based | Phonetic/ITRANS-style typing (`k a n n a D a` → ಕನ್ನಡ). |

The app is split into a generic engine and pure-data layout definitions, so a new layout is just one JSON file plus one line in the registry.

**Live structure** (plain static files, no build step, no dependencies):

```
index.html                 - page markup
style.css                   - all styling
app.js                      - generic engine (two strategies) + tutor logic
data/layouts.json           - registry: order, names, descriptions, tags
data/layouts/kgp.json       - KGP keymap (actions/terminators + historic key seq)
data/layouts/inscript.json       - InScript rules (ported from jquery.ime)
data/layouts/inscript2.json      - InScript 2 rules (ported from jquery.ime)
data/layouts/transliteration.json - Phonetic transliteration rules (ported from jquery.ime)
```

## Publish on GitHub Pages

1. Push this repo's `main` branch (keep the folder structure as-is - `app.js` fetches `data/layouts.json` and `data/layouts/*.json` by relative path).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, pick your branch (usually `main`) and folder `/ (root)`.
4. Save. GitHub will give you a URL like `https://<username>.github.io/<repo>/` within a minute or two.

That's the whole setup - everything here is static HTML/CSS/JS, so there's no server, no npm install, no build step.

## Running it locally before you push

Opening `index.html` directly by double-clicking (`file://…`) will **not** work, because `app.js` loads the layout JSON via `fetch()`, which browsers block on the `file://` protocol. Serve the folder instead:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

or any equivalent static server (`npx serve`, VS Code's Live Server extension, etc).

## What's inside

- **Layout picker** - in the header, across every tab. Your choice is remembered in `localStorage`, the virtual keyboards re-render, and all three typing surfaces switch engines immediately.
- **Layout tab** - the current layout's full keyboard (base + Shift legends), a reference strip for the historic/modifier entries (backquote `` ` `` on ಕೆಜಿಪಿ, ⌥ Alternate on the IME layouts), and a live test box that mirrors your physical keyboard. A digit switch on this tab toggles the number row between the layout's Kannada digits (೧೨೩) and Western digits (123).
- **Practice tab** - a 5-level typing tutor (vowels → consonants → consonant+vowel combinations → words → sentences) with WPM, accuracy, and streak tracking. Targets are Kannada text; the current layout's engine decides what your keystrokes produce.
- **Free Type tab** - an open canvas with grapheme-aware Backspace (removes one full akshara at a time).
- **Unicode tab** - all 91 assigned codepoints in the Kannada block, showing whether the selected layout produces each on a key, via a modifier, or not at all (with the keystroke to type it).
- **Layout data & review notes** - each layout's `data/layouts/<id>.json` also carries a `findings` array: the per-layout audit trail (bugs found and fixed, design notes, scope decisions). Kept in the repo only; not surfaced in the portal UI.

## Layout data provenance

- `data/layouts/kgp.json` is a plain extraction of the `.keylayout` file's `keyMap`, `actions`, and `terminators` tables (US-ANSI printable keys, codes 0–53), plus the historic-letter sequence. It already patches the original file's `&x200c;` / `&x200D;` bugs.
- `data/layouts/{inscript,inscript2,transliteration}.json` are ports of the [jquery.ime](https://github.com/wikimedia/jquery.ime) Kannada rules (Wikimedia), copied byte-for-byte and continuously verified against the upstream sources by a round-trip test. Two deliberate corrections: the InScript `F` key maps to ಌ (upstream shipped a wrong codepoint), and historic letters are documented on the Alternate/⌥ layer.

Each layout is pinned by a git tag so consumers can depend on a specific definition: `kgp-1.0`, `inscript-1.0`, `inscript2-1.0`, `transliteration-1.0`. Update a tag only when its layout data changes.

## Editing the keyboard data

Layout files are plain JSON. The engine reads a small in-file contract:

- **keymap** files (`kgp`): `keymap0`/`keymap1` (code → `{type:'output',value}` or `{type:'state' …}`), `actions`, `terminators`, `historicPrefixCode`/`historicPrefixChar`, `historicSeq` (keyed by `code*2 + shift`).
- **IME** files (the other three): `patterns`/`patterns_x`/`patterns_shift` with jquery.ime semantics - 2-element rules `[input, replacement]`, 3-element `[input, contextRegex, replacement]`; `maxKeyLength` and `contextLength` default to `1`/`0` if absent.

If the upstream data changes, re-port from the source rather than hand-editing - each file's `findings` array lists the known quirks the data already accounts for.