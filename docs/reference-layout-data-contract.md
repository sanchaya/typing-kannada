# Layout Data Contract

Kannada typing tutor layouts are pure data. The engine in `app.js` is a generic shell; every keyboard layout is a JSON file plus one line in a registry. This reference describes the exact contract those files must satisfy.

## Registry (`data/layouts.json`)

One top-level key, `layouts`, an ordered array. Order defines the layout picker order.

```json
{
  "layouts": [
    {
      "id": "kgp",
      "type": "keymap",
      "name": "ಕೆಜಿಪಿ / ನುಡಿ",
      "nameEn": "KGP · Nudi · KPRao phonetic",
      "file": "data/layouts/kgp.json",
      "tag": "kgp-1.0",
      "description": "Phonetic layout (KPRao/KGP/Nudi family). Type by sound - k→ಕ, A→ಾ, f→್, M→ಂ."
    }
  ]
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Unique layout id. Used as the storage key, the fetch path (`data/layouts/<id>.json`), and the practice-hint cache key. Lowercase ASCII. |
| `type` | `"keymap"` or `"ime"` | Which engine strategy runs this layout. See the two contracts below. |
| `name` | string | Kannada display name shown in the picker. |
| `nameEn` | string | English name, used in the README and layout descriptions. |
| `file` | string | Relative path to the layout JSON. |
| `tag` | string | Git tag that pins this layout version. Bump only when the layout data changes. |
| `description` | string | One-line summary shown under the picker. |

The engine also infers `type` from the registry entry if a layout file omits it (`finalizeLayout`).

## Layout file: shared fields

Every layout file carries these top-level fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Matches the registry id. |
| `type` | `"keymap"` or `"ime"` | Optional inside the file; the registry wins if both are present. |
| `name` / `nameEn` | string | Same as registry; displayed by renderers. |
| `tag` | string | Git tag. |
| `description` | string | Short summary. |
| `examples` | array | Cards shown on the Complex Chars tab. See below. |
| `findings` | array | Per-layout audit trail: bugs found and fixed, design notes, scope decisions. Kept in the repo only, never rendered in the UI. |

Both contracts default `maxKeyLength` to `1` and `contextLength` to `0` when absent.

## keymap contract (`type: "keymap"`)

A faithful re-implementation of a macOS `.keylayout` action/terminator state machine. Used by the KGP/Nudi layout.

### `keymap0` / `keymap1` (required)

Two maps: `keymap0` for the base layer, `keymap1` for Shift. Each is keyed by the **macOS ANSI virtual keycode** (0–51, the same numbering the app's `CODE_MAP` produces from a `KeyboardEvent.code`). The value is either:

- `{ "type": "output", "value": "<text>" }` - a key that always emits `value` directly.
- `{ "type": "action", "value": "<state>" }` - a key that enters or applies state, resolved through `actions`.

Example (keycode `0` is the physical `A` key):

```json
{ "0": { "type": "action", "value": "ಅ" } }
```

### `actions` (required)

A map keyed by the state names introduced by `action` entries. Each entry is itself a state table: keyed by the engine's **current state**, with a special `"none"` key for the idle state. Each cell is one of:

- `{ "output": "<text>" }` - emit text and return to `none`.
- `{ "next": "<state>" }` - transition to a new pending state without emitting.

When the current state has no matching cell, the engine falls back to `"none"` and, if a state was pending, flushes it through `terminators` first.

The KGP layout uses `actions["ಆ"]` to build matras: from state `"ಕ"` it outputs `"ಕಾ"`, from state `"ಖ"` outputs `"ಖಾ"`, and from `none` outputs the independent `"ಆ"`.

### `terminators` (required for stateful layouts)

A map from each possible pending state to the text that resolves it when an unrelated key arrives. For example `"ಕ"` → `"ಕ"`: a lone consonant left pending is flushed as-is (its inherent vowel) when the next non-matra key is pressed.

### `historicSeq`, `historicPrefixCode`, `historicPrefixChar` (optional)

Enables typing historic letters via a dead-key sequence.

| Field | Type | Meaning |
| --- | --- | --- |
| `historicPrefixCode` | integer | Virtual keycode of the dead key. KGP uses `50` (backquote). |
| `historicPrefixChar` | string | Optional display char for the prefix; defaults to `` ` ``. |
| `historicSeq` | object | Keyed by `code * 2 + (shift ? 1 : 0)` → the historic letter emitted. |

Pressing the prefix key arms the sequence (the engine shows the prefix char as a pending preview). Pressing a mapped key then emits the historic letter; pressing any unmapped key emits the prefix char followed by that key's normal output.

KGP example (`code*2+shift`): `"18"` → `"ಌ"` (backquote then `v`, keycode 9), `"30"` → `"ಱ"` (backquote then `r`, keycode 15).

## IME contract (`type: "ime"`)

A port of the Wikimedia `jquery.ime` rule matcher. Used by InScript, InScript 2, and Transliteration.

### `patterns`, `patterns_x`, `patterns_shift`

Arrays of rules, each rule one of two shapes:

- **2-element** `[input, replacement]` - matches when `input` ends the current composition window.
- **3-element** `[input, contextRegex, replacement]` - matches only when `contextRegex` matches the context text before the input (the trailing `contextLength` characters).

`input` is a regex source; `replacement` may contain `$1` backreferences to capture groups. Rules are tried in array order; the first match wins.

Layer selection at press time:

| Press | Rule set used |
| --- | --- |
| plain | `patterns` |
| Shift (when `patterns_shift` is non-empty) | `patterns_shift` followed by `patterns` |
| Alt (⌥) | `patterns_x` |

The composition window is the last `maxKeyLength` characters of the buffer; when a rule matches, only that window is replaced.

Examples (Transliteration, `maxKeyLength: 3`):

```json
[ "ಜ್್j", "ಜ್ಞ್" ],
[ "([ಕ-ಹೞ]಼?)್a", "$1ಾ" ]
```

`ಜ್್j` → `ಜ್ಞ್` shows substitution with no capture group; `([ಕ-ಹೞ]಼?)್a` → `$1ಾ` shows the common matra pattern: a consonant (optionally nukta-carrying) plus virama plus `a` becomes consonant plus `ಾ`.

### `maxKeyLength` (optional, default `1`)

Maximum input length any rule can match. The engine only examines the last N characters of the buffer as candidate input. Transliteration uses `3`.

### `contextLength` (optional, default `0`)

Length of the trailing context string kept for 3-element context-gated rules. Transliteration uses `5`.

## `examples` contract

Cards rendered on the Complex Chars tab. Each card:

| Field | Type | Meaning |
| --- | --- | --- |
| `tag` | string | Category label, e.g. "Traditional ligature". |
| `word` | string | The Kannada word or cluster being demonstrated. |
| `gloss` | string | English gloss or meaning. |
| `built` | string | Human description of the letter-by-letter composition. |
| `keys` | array | The keystrokes that produce the word. Each entry is one of: a string (literal key, e.g. `"k"`), a pair `[key, shift]` (e.g. `["N", true]`), or an object `{ "label": "…" }` for an Alt-layer key. |

The app renders each card with the target word's Unicode codepoints (joiners shown as ZWJ/ZWNJ).

## `findings` contract

Internal audit trail, never shown in the portal UI. Each entry:

| Field | Type | Meaning |
| --- | --- | --- |
| `sev` | string | Severity token (`info`, `fix`, etc.). |
| `sevLabel` | string | Human severity label. |
| `title` | string | Short title. |
| `body` | string | HTML body: the bug, the fix, the design note. |

## Versioning

Each layout is pinned by a git tag so external consumers can depend on a stable definition. Current tags: `kgp-1.0`, `inscript-1.0`, `inscript2-1.0`, `transliteration-1.0`. The registry's `tag` field records the tag; update a tag only when its layout data changes.

## Current layouts at a glance

| Layout | Type | patterns | patterns_x | examples | findings |
| --- | --- | --- | --- | --- | --- |
| `kgp` | keymap | 0 (keymap0/keymap1: 54 + 54) | n/a | 8 | 10 |
| `inscript` | ime | 81 | 13 | 6 | 3 |
| `inscript2` | ime | 86 | 14 | 7 | 2 |
| `transliteration` | ime | 127 | 0 | 6 | 2 |

## Related

- [Add a new layout](../docs/howto-add-a-layout.md) walks through authoring both file types.
- [Why two engines?](../docs/explanation-typing-engines.md) explains the state-machine vs rule-matcher split.
