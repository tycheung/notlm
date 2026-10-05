#!/usr/bin/env node
/**
 * Verifies this machine can publish the @notlm scope.
 * Does not publish. Exit 0 when ready; exit 1 with instructions otherwise.
 */
import { execSync } from 'node:child_process';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

let user;
try {
  user = sh('npm whoami');
} catch {
  console.error('npm auth: not logged in.');
  console.error('  npm login');
  console.error('  # or: npm config set //registry.npmjs.org/:_authToken <token>');
  process.exit(1);
}
console.log(`npm user: ${user}`);

try {
  const access = sh('npm access list packages @notlm 2>&1') || '';
  console.log(access || 'npm access list: (empty — create @notlm org / packages on first publish)');
} catch (err) {
  const msg = String(err?.stderr || err?.message || err);
  if (/ENEEDAUTH|404|not found|no packages/i.test(msg)) {
    console.warn(
      'npm scope @notlm: not claimed or no packages yet.\n' +
        '  1) Create an organization named "notlm" at https://www.npmjs.com/org/create\n' +
        '  2) Ensure your user can publish with access=public\n' +
        '  3) First publish: npm run publish:dry-run && (release PR / changeset publish)'
    );
    process.exit(1);
  }
  throw err;
}

console.log('check_npm_publish_ready: ok');
