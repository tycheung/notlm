# Tests

## Layout

| Path | Purpose |
|------|---------|
| `packages/*/src/**/*.test.ts` | Colocated unit tests (preferred for libraries) |
| `tests/unit/` | Cross-package architecture / CI parity |
| `tests/e2e/` | Playwright coach smoke fixtures |
| `packs/*/.notlm/pack/corpus.json` | NLU corpus cases per pack |

## Markers / tags

Playwright describe tags (no `@mapper` suite):

- `@guide-nlu` — coach / NLU smoke
- `@guide-chrome` — FAB, chat panel, threads
- `@guide-saturate` — saturation pool
- `@ui-actions` — palette / control activation

Do **not** require real microphone input.

## Coverage policy

Vitest global coverage floors are **40%** (lines, functions, statements) in root `vitest.config.ts`.
Omit generated emit output; test generators instead.

## Corpus rule

Every step alias and meta intent must have clean (and ideally slang/typo/STT-truncated) cases before the pack is considered ready.
