# Publish gate checklist

Live `npm publish` is blocked until every item is checked and a human approves.

- [x] Changesets release PR green (`npx changeset status` / version reviewed)
- [x] `npm run publish:dry-run` green on CI
- [x] `npm pack` contents reviewed (no host packs, secrets, `.env`)
- [x] Host bleed + architecture tests green
- [x] Coverage floors meet `vitest.config.ts` (chrome shells e2e; helpers+fallback unit floors ≥70% lines)
- [x] Package READMEs + CHANGELOG accurate for the release (`1.0.0`)
- [x] Demo apps build against the release line (CI gate + `intents check`)
- [ ] npm org `@notlm` claimed + this machine authenticated (`npm run check:npm`)
- [ ] Explicit human approval for `npm publish`

Until the last two are checked: root stays `private: true`; only the dry-run
workflow publishes nothing. First live release: consume a green release PR, then
publish the fixed `1.0.0` group (`@notlm/core`, `react`, `schema`, `ranker`,
`cli`, `ops`).

```bash
npm run check:npm          # whoami + @notlm scope access
npm run publish:dry-run    # pack + npm publish --dry-run (no upload)
# after human approval / CI release workflow:
# npx changeset publish
```
