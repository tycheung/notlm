# Publish gate checklist

Live `npm publish` is **blocked** until every item is checked and a human
explicitly approves.

- [ ] Changesets release PR green (`npx changeset version` reviewed)
- [ ] `npm run publish:dry-run` green on CI
- [ ] `npm pack` contents reviewed (no host packs, secrets, `.env`)
- [ ] Host bleed + architecture tests green
- [ ] React/core coverage floors match vitest.config (currently ≥40%; raise to ≥60% chrome/fallback before publish)
- [ ] Package READMEs + CHANGELOG accurate for the release
- [ ] Demo apps build against workspace `0.1.x`
- [ ] Explicit human approval for `npm publish`

Until then: root `private: true`; only dry-run workflow publishes nothing.
