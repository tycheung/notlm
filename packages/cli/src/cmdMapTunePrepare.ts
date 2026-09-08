import {
  cmdDagGenerate,
  cmdExtractStatic,
  cmdPackAuthor,
} from './commands.js';
import {
  cmdScenariosSaturate,
  runIntentsTuneIfPossible,
} from './cmdScenarios.js';
import { pathExists, resolveUipilotHome } from './uipilotHome.js';

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name) || args.some((a) => a.startsWith(`${name}=`));
}

function stripFlags(args: string[], names: string[]): string[] {
  const drop = new Set(names);
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (drop.has(a)) continue;
    out.push(a);
  }
  return out;
}

function positionalDir(args: string[]): string | undefined {
  for (const a of args) {
    if (a.startsWith('-')) continue;
    return a;
  }
  return undefined;
}

/**
 * `uipilotCLI map [dir] [--src <path>] [--llm] [--html <file>] [--url <url>]`
 * Mechanical extract + dag generate; optional pack author with --llm.
 */
export async function cmdMap(args: string[]): Promise<void> {
  const dir = positionalDir(args);
  const { home } = resolveUipilotHome(dir);
  const withLlm = hasFlag(args, '--llm');

  // extract static if --src or a bare src-looking path provided via extract's own parser
  const srcIdx = args.indexOf('--src');
  if (srcIdx >= 0 || args.some((a) => a === '--src')) {
    await cmdExtractStatic(args);
  } else if (process.env.UIPILOT_MAP_SRC) {
    await cmdExtractStatic(['--src', process.env.UIPILOT_MAP_SRC, dir].filter(Boolean) as string[]);
  }

  // Optional inventory crawl flags passthrough is left to atomic command;
  // map always runs dag generate when home exists (or after init expectation).
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  await cmdDagGenerate(dir);
  console.log('map: mechanical DAG draft written (structured-draft.json + checklist.json)');

  if (withLlm) {
    console.log('map: running pack author (--llm) → drafts/ only');
    await cmdPackAuthor(dir);
  }
}

/**
 * `uipilotCLI tune [dir] [--fixture] [--batch=N] [--force=N] [--label]`
 * Saturate scenarios then intents tune (compose atomics).
 * `--force=N` hard-adds exactly N candidates (ignore similarity).
 */
export async function cmdTune(args: string[]): Promise<void> {
  const dir = positionalDir(args);
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  // Default fixture-friendly for CI unless LLM env present and --llm-generate
  const forceFixture =
    hasFlag(args, '--fixture') ||
    process.env.UIPILOT_SATURATE_FIXTURE === '1' ||
    !process.env.UIPILOT_LLM_PROVIDER;

  const saturateArgs = [...args];
  if (forceFixture && !hasFlag(saturateArgs, '--fixture')) {
    saturateArgs.push('--fixture');
  }

  console.log('tune: scenarios saturate…');
  await cmdScenariosSaturate(saturateArgs);
  if (process.exitCode && process.exitCode !== 0) return;

  if (!forceFixture || process.env.UIPILOT_LLM_PROVIDER) {
    console.log('tune: intents tune…');
    await runIntentsTuneIfPossible(dir);
  } else {
    console.log('tune: skip intents tune (fixture / no UIPILOT_LLM_PROVIDER)');
  }
}

/**
 * `uipilotCLI prepare [dir] [--llm] …` — map then tune.
 */
export async function cmdPrepare(args: string[]): Promise<void> {
  console.log('prepare: map…');
  await cmdMap(stripFlags(args, []) /* keep --llm for map */);
  if (process.exitCode && process.exitCode !== 0) return;

  console.log('prepare: tune…');
  // Do not pass --llm into tune; map already consumed it
  const tuneArgs = stripFlags(args, ['--llm']);
  await cmdTune(tuneArgs);
}
