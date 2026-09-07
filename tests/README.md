# Tests

## Layout

| Path | Purpose |
|------|---------|
| `packages/*/src/**/*.test.ts` | Colocated unit tests (preferred for libraries) |
| `tests/unit/` | Cross-package architecture / CI parity |
| `tests/e2e/` | Playwright coach + mapper crawl fixtures |
| `packs/*/corpus.json` | NLU corpus cases per pack |

## Markers / tags

- Playwright: `@guide-nlu` for coach smoke
- Playwright: `@mapper` for inventory crawls
- Do **not** require real microphone input

## Coverage policy

- Global unit ≥ 75%
- `@workflow-assistant/core` ≥ 85%
- Omit generated emit output; test generators instead

## Corpus rule

Every step alias and meta intent must have clean (and ideally slang/typo/STT-truncated) cases before a pack slice is done.
