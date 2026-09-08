#!/usr/bin/env node
/**
 * Require async handoff sections on pull request bodies (PR CI only).
 */
import fs from 'node:fs';

const REQUIRED = ['## Summary', '## Test plan'];
const HINTS = ['Intent', 'Smoke', 'Risk', 'Companion'];

if (process.env.SKIP_PR_HANDOFF === '1') {
  console.log('SKIP_PR_HANDOFF=1 — handoff gate skipped');
  process.exit(0);
}

const eventName = process.env.GITHUB_EVENT_NAME || '';
if (eventName && eventName !== 'pull_request') {
  console.log(`event=${eventName} — handoff gate skipped (PR-only)`);
  process.exit(0);
}

if (!eventName) {
  console.log('not in GitHub Actions — handoff gate skipped');
  process.exit(0);
}

const eventPath = process.env.GITHUB_EVENT_PATH;
let body = '';
if (eventPath && fs.existsSync(eventPath)) {
  const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  body = (payload.pull_request && payload.pull_request.body) || '';
}

const normalized = String(body).replace(/\r\n/g, '\n');
const missing = REQUIRED.filter((h) => !normalized.includes(h));
if (missing.length) {
  console.error('PR handoff gate failed — missing required sections:');
  for (const item of missing) console.error(`  - ${item}`);
  console.error('Use .github/pull_request_template.md (Summary + Test plan minimum).');
  process.exit(1);
}

const lower = normalized.toLowerCase();
const present = HINTS.filter((h) => lower.includes(h.toLowerCase()));
const absent = HINTS.filter((h) => !lower.includes(h.toLowerCase()));
console.log('ok required PR sections present:', REQUIRED.join(', '));
if (present.length) console.log('ok handoff hints found:', present.join(', '));
if (absent.length) {
  console.error('note: prefer also documenting:', absent.join(', '));
}
