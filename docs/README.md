# ಕೀಲಿಕನ್ನಡ Documentation

Documentation for the TypeKannada typing tutor: how to use it, how the layout data works, and how the two typing engines behave.

## For users

- [Learn Kannada Typing on Your Own Keyboard](tutorial-learn-kannada-typing.md) (tutorial) - pick a layout, type your first letters, work through the practice levels, and use the Free Type and Unicode reference tabs.

## For maintainers

- [Add a new layout](howto-add-a-layout.md) (how-to) - a new layout is one JSON file plus one registry line; this walks both the keymap and IME shapes.
- [Run locally and publish to GitHub Pages](howto-serve-and-publish.md) (how-to) - local development server, Pages deployment, custom domain.
- [Layout Data Contract](reference-layout-data-contract.md) (reference) - the complete schema for `data/layouts.json`, keymap files, IME files, examples, findings, and the versioning tags.
- [Why two typing engines?](explanation-typing-engines.md) (explanation) - the keymap state machine vs the `jquery.ime` rule matcher, and how practice hints are generated across both.

## Reading order

Newcomers start with the tutorial. Maintainers start with the reference contract, then the how-to. The explanation ties everything together if you need to change how typing works rather than just add data.