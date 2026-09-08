#!/usr/bin/env node
/**
 * Fail if known frontend god components grow past recorded ceilings.
 * Prefer extracting hooks/components over raising limits.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Soft ceilings at quality-audit baseline — do not raise without an extraction PR. */
const GOD_COMPONENT_MAX_LINES = {
  'src/components/event/ParticipantManagementTable.tsx': 1700,
  'src/components/event-round/EventRoundWorkspace.tsx': 1750,
  'src/pages/events/EventDetails.tsx': 1281,
  'src/components/side_actions/SideActionReportsMenuModal.tsx': 1200,
  'src/components/event/TeamScoring.tsx': 1100,
  'src/api/axios.ts': 474,
};

let failed = false;
for (const [rel, ceiling] of Object.entries(GOD_COMPONENT_MAX_LINES)) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) {
    console.error(`missing file: ${rel}`);
    failed = true;
    continue;
  }
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
  if (lines > ceiling) {
    console.error(`${rel}: ${lines} lines > ceiling ${ceiling}`);
    failed = true;
  } else {
    console.log(`ok ${rel}: ${lines}/${ceiling}`);
  }
}

if (failed) {
  console.error('God-component size gate failed. Extract hooks/components instead of growing these files.');
  process.exit(1);
}
