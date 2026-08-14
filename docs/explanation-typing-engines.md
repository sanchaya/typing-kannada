# Why Two Typing Engines?

The app teaches four real Kannada layouts, and those layouts are not built from the same technology. Two of them are rule-based text matchers and one is a hardware-style key state machine. This explainer walks through what each engine does, why the app needed both, and what each gives up.

## The problem

A "typing layout" in the real world is delivered in one of two forms:

- **A keymap file** (macOS `.keylayout`, Linux XKB, Windows layout DLL). KGP/Nudi ships as a macOS `.keylayout` file. A layout like this is a state machine: keys produce letters, but some keys only make sense in context (matras after a consonant), and there is a concept of "pending input" that resolves later.
- **A rule set** (like Wikimedia `jquery.ime`). InScript, InScript 2, and Transliteration are defined as lists of string-transformation rules: "if `ಕ` + `ಿ` is at the end of the text, replace it with `ಕಿ`", plus a context window for disambiguation.

These are fundamentally different computational models. A keyboard emulator cannot interpret `jquery.ime` rules by key code, and a rule matcher does not understand "Shift makes this key emit a different char". Trying to force one model to fit all four layouts produces a mess of special cases.

Without a unified interface on top, every new layout would drag the whole app's input handling through its own bespoke logic.

## The approach

`app.js` defines two engine factories with a **shared interface**, so a typing surface never cares which one it holds:

```
        attachTypingSurface(el, kb, opts)
                    |
        +-----------+------------+
        |                        |
keymapEngine                imeEngine
  pressLayout(code, shift)    processChar(buffer, ch, altGr, shift)
  press(code, shift)          backspace()
  backspace()                 pendingPreview()   (always '')
  pendingPreview()            flush()            (always '')
  flush()
```

Both engines expose `reset()`, `backspace()`, `pendingPreview()`, and `flush()`. Unknown operations return conservative values (`''`, `false`) rather than throwing, so a surface can talk to either engine with zero branching.

### keymap: actions and terminators

The keymap engine faithfully re-implements the macOS `.keylayout` model. A key's entry is either `output` (emit this string now) or `action` (resolve through the `actions` table). The table is keyed by *current state*: press a consonant (`ಕ`), and the engine enters state `"ಕ"`. Press a matra key (`A`), and the `"ಆ"` action's table looks up state `"ಕ"` and outputs `"ಕಾ"`.

There is no output until the state resolves:

```
 key:        K          A          f
 state:    none -> "ಕ"  "ಕ" -> _____  -> emits "ಕಾ" (state clears)
 text:      ""         "ಕ"  -> "ಕಾ"
```

If a non-matra key arrives while a state is pending, the `terminators` map flushes it: a plain `ಕ` left hanging emits `ಕ`, the consonant plus its inherent vowel.

This is exactly how the real layout behaves, preserved bit for bit. The trade-off is complexity: 83 actions, 103 terminators, and a hard-to-read table structure. But it is *correct*, which matters more than pretty for a keyboard people actually use.

### ime: windowed matcher

The IME engine is a port of `jquery.ime`'s `transliterate()`. Each keystroke builds a candidate from the last `maxKeyLength` characters of the buffer plus the new character, then runs a precompiled list of regex rules in order. First match wins:

```
 window  = buffer.slice(-maxKeyLength)
 output  = window, transformed by the first matching rule
 result  = buffer[:len-keylen] + output
```

3-element rules add a context guard: the rule fires only if the context text (the trailing `contextLength` characters) matches a second regex. This is what disambiguates cases like independent vs dependent vowels.

Two details make this efficient in a browser:

- **Precompiled rules.** Rule regexes are compiled once per layout and cached per layout object (`PATTERN_CACHE`), not per keystroke. The practice-hint search below replays the engine tens of thousands of times per lesson item, so per-keystroke regex parsing would be expensive.
- **Noop passthrough.** When nothing matches, the character is appended verbatim. Latin text, punctuation, and spaces flow through unchanged.

The trade-off is that rule sets are pay-to-play: the matching order, the context windows, and the capture groups are all authored by hand. Getting a rule set wrong produces subtle ordering bugs, which is why the layout files carry a `findings` audit trail.

## How practice hints survive both models

The Practice tab shows the keystrokes that produce each target. It cannot hardcode this per layout, so it **replays the engine**: a bounded breadth-first search tries every key (with and without Shift), feeds it through the current layout's real engine, and keeps any state whose buffer can still grow toward the target.

Three quirks make that search tractable:

1. **Dedupe by hidden state, not output.** The IME's context tail and the keymap's pending state and dead-key sequence are what the next keystroke depends on. Two paths with the same committed text but different hidden state are distinct; the search keys on `(buffer, engine state)`, not `(buffer)`.

2. **Skeleton normalisation for IMEs.** IMEs build aspirates by substitution (`ಟ್` + `h` → `ಠ್`), so mid-search text is often not a literal prefix of the goal. The search strips virama/nukta and maps aspirated consonants to their base (`ಠ` → `ಟ`, `ಶ` → `ಸ`) before comparing.

3. **Whitespace-run chaining for keymaps.** KGP commits a dangling consonant via the *next* key, so a word cannot be hinted grapheme-by-grapheme. The search treats each whitespace-delimited run as one unit and attaches the space to the word before it, because the space is itself the key that commits the trailing consonant.

The search is capped (depth 5 per grapheme, depth 12 for keymap words, a 20,000-state frontier) and the result is cached per `(layout, target)`. The cost is paid once; switching layouts is instant.

## Trade-offs

| Choice | Gained | Given up |
| --- | --- | --- |
| Two engines over one | Each layout runs its native model, bit-faithful | Two code paths to test and maintain |
| Pure-data layouts | New layout = one JSON file + one registry line | No code-level programmability inside a layout |
| Bounded hint search | Guaranteed correct suggestions, any layout | First-use cost while the search runs |
| Faithful over gold-plated | KGP behaves exactly like the real keyboard | Keymap data is large (1,000+ lines) and intimidating |

## Alternatives considered

- **A single abstract "letters per key" table.** Rejected: it cannot express matras that depend on the preceding consonant, let alone `jquery.ime` context rules.
- **Porting every layout into one unified rule model.** Rejected: re-authoring the KGP keymap as regex rules would introduce drift from the real `.keylayout`, which is the entire point of KGP.
- **Hardcoded hint tables.** Rejected: hints would go stale the moment a layout file changed, and every layout would need manual maintenance.

## Related

- [Layout Data Contract](../docs/reference-layout-data-contract.md) documents both file shapes precisely.
- [Add a new layout](../docs/howto-add-a-layout.md) shows writing a file for either engine.