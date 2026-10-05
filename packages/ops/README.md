# @notlm/ops

Installable ops scaffolds for NotLM hosts:

- **Laya sidecar** — small optional decision model HTTP service
- **Celery nightly promote** — CPU pack/ranker promote stub (no weight training)

## Install

```bash
npm install @notlm/ops
# or via CLI:
npx notlmCLI laya install ./backend
npx notlmCLI celery install ./backend
```

## Programmatic

```ts
import { installLayaSidecar, installNightlyCelery } from '@notlm/ops';

installLayaSidecar({ targetDir: './backend' });
installNightlyCelery({ targetDir: './backend' });
```

Templates ship under `templates/` in the published package. Hosts own wiring,
secrets, and deploy.

## License

MIT
