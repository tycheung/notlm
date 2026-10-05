# @notlm/schema

JSON Schema + Ajv validation for NotLM pack files (flow, intents, FAQ, catalogs, heuristics).

## Install

```bash
npm install @notlm/schema
```

## Usage

```ts
import { validatePiece, validatePackFolder } from '@notlm/schema';

const piece = validatePiece('intents', intentsJson);
if (!piece.ok) console.error(piece.errors);

const folder = validatePackFolder('/path/to/.notlm/pack');
if (!folder.ok) console.error(folder.errors);
```

Prefer `npx notlmCLI validate <app>` for host apps. This package is for
programmatic / CI use.

## License

MIT
