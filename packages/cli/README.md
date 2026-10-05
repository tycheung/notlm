# @notlm/cli (`notlmCLI`)

Thin operating CLI for NotLM hosts: init a `.notlm/` home, validate packs, run
intent/ranker gates, and install Laya / Celery scaffolds from `@notlm/ops`.

## Install

```bash
npm install -g @notlm/cli
# or
npx notlmCLI <command>
```

## Commands

```bash
npx notlmCLI init <appDir>
npx notlmCLI validate <appDir>
npx notlmCLI intents check <appDir>
npx notlmCLI ranker check <appDir>
npx notlmCLI laya install <backendDir>
npx notlmCLI celery install <backendDir>
```

Authoring, saturation, and model training are **out of scope** for this CLI.

## License

MIT
