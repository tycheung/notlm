# @notlm/core API tiers

| Import | Environment | Purpose |
|--------|-------------|---------|
| `@notlm/core` | Browser + Node | Dispatch, types, miss/conversation log, fallback helpers |
| `@notlm/core/loadFolder` | **Node only** | Load `.notlm/` from disk (`fs`) |
| `@notlm/core/internal` | Advanced | Dispatch shards / heuristicsDefaults — prefer not to depend from hosts |

Prefer the main entry for product hosts. Use `loadFolder` only in CLI / Node tools.
