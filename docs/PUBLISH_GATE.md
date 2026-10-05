# Publish gate checklist

Live `npm publish` is blocked until every item is checked and a human approves.

- [ ] Changesets release PR green (`npx changeset version` reviewed)
- [ ] `npm run publish:dry-run` green on CI
- [ ] `npm pack` contents reviewed (no host packs, secrets, `.env`)
- [ ] Host bleed + architecture tests green
- [ ] Coverage floors meet `vitest.config.ts` (raise chrome/fallback floors before public release if needed)
- [ ] Package READMEs + CHANGELOG accurate for the release
- [ ] Demo apps build against the release line
- [ ] Explicit human approval for `npm publish`

Until then: root `private: true`; only the dry-run workflow runs (publishes nothing).
