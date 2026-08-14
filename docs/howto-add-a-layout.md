# How to Add a New Layout

A new Kannada layout is one JSON file plus one line in the registry. You do not touch `app.js`, `index.html`, or `style.css`.

## Prerequisites

- A working copy of this repo (you can add a layout while the app runs locally; reload the page to pick it up).
- The layout's source material: a `.keylayout` file (for a keymap) or a `jquery.ime` rule set (for an IME).

## Steps

### 1. Decide which engine your layout needs

- **keymap** - your layout is a real keyboard (a `.keylayout`, XKB, or Nudi-style keymap). Keys are addressed by physical keycode and can carry state (matras pending on a consonant).
- **ime** - your layout is a transliteration / rule-based method (InScript, ITRANS). Keystrokes are Roman or positional characters transformed by ordered rules.

### 2. Create `data/layouts/<id>.json`

Use `<id>` as the layout's short id (lowercase ASCII). Base the file on the corresponding example:

- Keymap shape: copy `data/layouts/kgp.json` and replace the tables.
- IME shape: copy `data/layouts/inscript.json` or `data/layouts/transliteration.json`.

#### Minimal keymap file

```json
{
  "id": "demo",
  "type": "keymap",
  "name": "Demo",
  "nameEn": "Demo layout",
  "tag": "demo-1.0",
  "description": "Demo layout for documentation.",
  "keymap0": {
    "0": { "type": "action", "value": "ಅ" }
  },
  "keymap1": {
    "0": { "type": "output", "value": "ಆ" }
  },
  "actions": {
    "ಅ": {
      "none": { "next": "ಅ" }
    }
  },
  "terminators": { "ಅ": "ಅ" },
  "examples": [],
  "findings": []
}
```

Notes on the keymap contract:

- `keymap0` / `keymap1` keys are **macOS ANSI virtual keycodes** (the same numbers `app.js` derives from `KeyboardEvent.code`). Keycode `0` is the physical `A` key, `18`–`29` the number row, `50` the backquote. Use the existing `kgp.json` tables as a code reference.
- `{ "type": "output" }` entries emit immediately. `{ "type": "action" }` entries route through `actions`.
- `actions` is keyed by state; each cell is `{ "output": "…" }` (emit and reset) or `{ "next": "…" }` (hold pending).
- `terminators` maps each pending state to the text emitted when an unrelated key arrives. A matra action like `"ಆ"` with state `"ಕ"` outputs `"ಕಾ"`; with state `"none"` it outputs the independent `"ಆ"`.
- Optional: `historicSeq` (keyed by `code * 2 + shift`), `historicPrefixCode`, `historicPrefixChar` for historic letters behind a dead key.

#### Minimal IME file

```json
{
  "id": "demo-ime",
  "type": "ime",
  "name": "Demo IME",
  "nameEn": "Demo IME layout",
  "tag": "demoime-1.0",
  "description": "Demo IME for documentation.",
  "patterns": [
    [ "k", "ಕ್" ],
    [ "ka", "ಕ" ],
    [ "([ಕ-ಹೞ]಼?)್a", "$1ಾ" ]
  ],
  "patterns_x": [],
  "patterns_shift": [],
  "maxKeyLength": 2,
  "contextLength": 0,
  "examples": [],
  "findings": []
}
```

Notes on the IME contract:

- Rules are `[input, replacement]` or `[input, contextRegex, replacement]`, tried in order. `input` is a regex source; `replacement` may use `$1` captures.
- `maxKeyLength` (default 1) caps how far back the matcher looks. Set it to the longest rule input you use, or longer rules will never match.
- `contextLength` (default 0) sizes the context window for 3-element rules. Set it to the longest context regex length you need.
- `patterns_x` (Alt/⌥ layer) and `patterns_shift` (Shift layer, appended after `patterns`) are optional.

### 3. Register the layout

Add one object to the `layouts` array in `data/layouts.json`:

```json
{
  "id": "demo",
  "type": "keymap",
  "name": "Demo",
  "nameEn": "Demo layout",
  "file": "data/layouts/demo.json",
  "tag": "demo-1.0",
  "description": "Demo layout for documentation."
}
```

The layout picker, keyboards, practice tutor, hint search, and Unicode coverage all pick it up automatically.

### 4. Verify

1. Serve the folder and reload: `python3 -m http.server 8080`, then open `http://localhost:8080`.
2. Pick your layout from the header. Type in the Layout tab surface: the board should mirror your keys and the composition should match the real layout.
3. Switch to the Complex Chars tab: the Unicode grid shows which codepoints your layout reaches, and every card in the examples grid should list the correct keystrokes.
4. Open a Practice level (e.g. Vowels) and confirm the suggested hints actually type the target.

There is no automated test suite in this repo, so this manual pass is the verification gate. If your source is a `jquery.ime` rule set, copy the rules byte-for-byte from upstream rather than hand-transcribing; note any deliberate corrections in the file's `findings` array.

### 5. Tag the layout version

When the layout data is final, create a git tag named like the registry `tag` field (e.g. `demo-1.0`) so consumers can depend on that definition. Update the tag only when the layout data changes.

## Verification (checklist)

- [ ] Layout file loads: no console errors, picker shows the new entry.
- [ ] Base and Shift layers type the expected letters on the Layout tab.
- [ ] Matra/context composition matches the real layout.
- [ ] Practice hints, where shown, type the target.
- [ ] `examples` cards render with correct keystrokes and codepoints.
- [ ] Registry `tag` field matches an existing git tag.

## Troubleshooting

**Page fails to load layouts.** You opened `index.html` via `file://`; `fetch()` is blocked there. Serve the folder (step 4) or visit the deployed GitHub Pages site.

**Some keys produce nothing.** Those virtual keycodes are missing from `keymap0`/`keymap1`, or no IME rule matches. Check the code numbers against the `kgp.json` tables.

**Longer IME rules never fire.** `maxKeyLength` is too small; raise it to the longest rule input length.

**Hints are wrong or missing.** The hint search replays your engine, so wrong hints mean the engine output disagrees with what you intended. Re-check rule order: the first matching rule wins.

## Related

- [Layout Data Contract](../docs/reference-layout-data-contract.md) is the full schema reference.
- [Why two engines?](../docs/explanation-typing-engines.md) explains how the app consumes both shapes.