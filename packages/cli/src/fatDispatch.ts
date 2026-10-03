/**
 * Commands that are not part of the thin operating CLI.
 * Treated as unknown — no pointer to external tooling.
 */

const UNSUPPORTED_TOP = new Set([
  'inventory',
  'extract',
  'trace',
  'annotate',
  'jobs',
  'checklist',
  'dag',
  'pack',
  'scenarios',
  'map',
  'tune',
  'prepare',
  'talk',
  'misses',
  'exchanges',
  'metrics',
]);

/** True when the verb is outside the thin operating surface. */
export function isUnsupportedCommand(cmd: string | undefined, sub?: string): boolean {
  if (!cmd) return false;
  if (UNSUPPORTED_TOP.has(cmd)) {
    if (cmd === 'pack') return sub === 'author' || sub === 'accept';
    return true;
  }
  if (cmd === 'intents' && sub === 'tune') return true;
  if (cmd === 'ranker' && sub === 'train') return true;
  return false;
}

export function unsupportedCommandMessage(cmd: string): string {
  return `Not available in notlmCLI: ${cmd}`;
}
