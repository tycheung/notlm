import {
  checkIntents,
  createProviderFromEnv,
  faqDraftFromSoftLabels,
  generateScenarioCandidates,
  llmBatchGenerator,
  mineIntentFailures,
  runHardAugment,
  runSaturationLoop,
  scoreBatchAgainstPrior,
  softLabelCandidates,
  tuneIntents,
  type ScenarioCandidate,
  type ScenarioGenerateMode,
} from '@uipilot/author';
import type { IntentParsePack } from '@uipilot/core';
import {
  draftsDir,
  ensureDir,
  join,
  loadPackFolderJson,
  pathExists,
  readJsonFile,
  resolveUipilotHome,
  writeJsonFile,
} from './uipilotHome.js';

function saturationDir(home: string): string {
  return join(home, 'saturation');
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function asIntentPack(files: Record<string, unknown>): IntentParsePack | null {
  const flow = files.flow;
  const intents = files.intents as { aliases?: Record<string, string[]>; meta?: string[] } | undefined;
  if (!Array.isArray(flow) || !intents) return null;
  return {
    steps: flow as IntentParsePack['steps'],
    aliases: intents.aliases ?? {},
    meta: intents.meta,
  };
}

function parseFlag(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  return args[i + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name) || args.some((a) => a.startsWith(`${name}=`));
}

function positionalDir(args: string[]): string | undefined {
  const valueFlags = new Set([
    '--batch',
    '--max-batches',
    '--epsilon',
    '--force',
    '--hard',
    '--blurb',
    '--mode',
    '--chunk',
  ]);
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (valueFlags.has(a)) {
      i += 1;
      continue;
    }
    if (a.startsWith('--')) continue;
    // bare numbers are option values when npm strips flag names
    if (/^\d+$/.test(a)) continue;
    return a;
  }
  return undefined;
}

/** npm often strips `--batch 5`; accept leftover bare integers as batch then maxBatches. */
function bareNumbers(args: string[]): number[] {
  return args.filter((a) => /^\d+$/.test(a)).map(Number);
}

/** `--force=N` / `--hard=N` — hard augment count (ignore similarity). */
function parseForceCount(args: string[]): number | undefined {
  const raw = parseFlag(args, '--force') ?? parseFlag(args, '--hard');
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function loadPriorCandidates(home: string): ScenarioCandidate[] {
  const path = join(saturationDir(home), 'candidates.json');
  if (!pathExists(path)) return [];
  const data = readJsonFile<{ candidates?: ScenarioCandidate[] }>(path);
  return Array.isArray(data.candidates) ? data.candidates : [];
}

function writeSaturationArtifacts(
  home: string,
  candidates: ScenarioCandidate[],
  report: unknown,
  batchId?: string,
  batchSlice?: ScenarioCandidate[]
): void {
  const sat = saturationDir(home);
  ensureDir(sat);
  writeJsonFile(join(sat, 'candidates.json'), {
    updatedAt: new Date().toISOString(),
    candidates,
  });
  writeJsonFile(join(sat, 'novelty-report.json'), report);
  if (batchId && batchSlice) {
    const batches = join(sat, 'batches');
    ensureDir(batches);
    writeJsonFile(join(batches, `${batchId}.json`), {
      batchId,
      candidates: batchSlice,
    });
  }
}

function appendChecklist(home: string, items: Array<Record<string, unknown>>): void {
  const path = join(home, 'checklist.json');
  const current = pathExists(path)
    ? readJsonFile<{ items?: unknown[] }>(path)
    : { items: [] };
  const list = Array.isArray(current.items) ? [...current.items] : [];
  list.push(...items);
  writeJsonFile(path, { items: list });
}

/** Shared fixture utterances for --fixture / CI (no LLM). */
const FIXTURE_SEED = [
  'open a fresh grocery list for me',
  'toss eggs onto the list',
  'completely unrelated astronomy question',
  'finish the first incomplete todo',
  "what should I do next in this app",
] as const;

const USER_ASK_FIXTURE_SEED = [
  'is this app free to use',
  'how do I share my list with my partner',
  'can I use this offline on my phone',
  'where did my todos go after refresh',
  'does it sync across devices',
  'who can see my shopping lists',
  'why cant i add an item yet',
  'is there a dark mode',
] as const;

function resolveProductBlurb(
  args: string[],
  files: Record<string, unknown>
): string | undefined {
  const fromFlag = parseFlag(args, '--blurb')?.trim();
  if (fromFlag) return fromFlag;
  const config = files.config as
    | { author?: { productBlurb?: string; blurb?: string } }
    | undefined;
  const fromConfig =
    config?.author?.productBlurb?.trim() || config?.author?.blurb?.trim();
  return fromConfig || undefined;
}

function resolveGenerateMode(args: string[]): ScenarioGenerateMode {
  const raw = (parseFlag(args, '--mode') ?? '').trim().toLowerCase();
  if (raw === 'user-ask' || raw === 'ask' || raw === 'blurb') return 'user-ask';
  if (hasFlag(args, '--user-ask')) return 'user-ask';
  return 'flow';
}

/** Fixture generator: decreasing novelty so saturate can plateau without LLM. */
function fixtureBatchGenerator(
  seed: readonly string[] = FIXTURE_SEED
): (ctx: {
  batchIndex: number;
  batchSize: number;
  priorUtterances: string[];
}) => Promise<Array<{ id?: string; utterance: string }>> {
  return async ({ batchIndex, batchSize, priorUtterances }) => {
    if (batchIndex === 0) {
      return Array.from({ length: batchSize }, (_, i) => ({
        id: `fix-${i}`,
        utterance:
          seed[i % seed.length]! +
          (i >= seed.length ? ` pad-${i}` : ''),
      }));
    }
    const pool = priorUtterances.length > 0 ? priorUtterances : [...seed];
    return Array.from({ length: batchSize }, (_, i) => ({
      id: `fix-r${batchIndex}-${i}`,
      utterance: pool[i % pool.length]!,
    }));
  };
}

/**
 * `uipilotCLI scenarios generate [dir] --batch N [--fixture] [--force=N]`
 * Writes saturation/ candidates + novelty report; never touches pack/.
 * `--force=N` emits exactly N candidates (ignore similarity / plateau).
 */
export async function cmdScenariosGenerate(args: string[]): Promise<void> {
  const dir = positionalDir(args);
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const forceCount = parseForceCount(args);
  const bare = bareNumbers(args);
  const batchSize = Number(
    parseFlag(args, '--batch') ?? bare[0] ?? (forceCount ? String(forceCount) : '100')
  );
  const useFixture = hasFlag(args, '--fixture') || process.env.UIPILOT_SATURATE_FIXTURE === '1';
  const mode = resolveGenerateMode(args);
  const files = loadPackFolderJson(home);
  const productBlurb = resolveProductBlurb(args, files);
  const pack = asIntentPack(files);
  if (!pack) {
    console.error('pack/ requires flow.json and intents.json');
    process.exitCode = 1;
    return;
  }

  const prior = loadPriorCandidates(home);
  const inventory = pathExists(join(home, 'inventory.json'))
    ? readJsonFile(join(home, 'inventory.json'))
    : undefined;
  const structuredDraft = pathExists(join(home, 'structured-draft.json'))
    ? readJsonFile(join(home, 'structured-draft.json'))
    : undefined;

  const fixtureSeed = mode === 'user-ask' ? USER_ASK_FIXTURE_SEED : FIXTURE_SEED;
  const generateBatch = useFixture
    ? fixtureBatchGenerator(fixtureSeed)
    : llmBatchGenerator({
        provider: createProviderFromEnv(),
        flowSteps: files.flow,
        intents: files.intents,
        inventory,
        structuredDraft,
        productBlurb,
        mode,
      });

  if (forceCount !== undefined) {
    const result = await runHardAugment({
      pack,
      prior,
      count: forceCount,
      chunkSize: Math.min(100, forceCount),
      generateBatch,
    });
    writeSaturationArtifacts(home, result.candidates, {
      ...result.report,
      mode,
      productBlurb: productBlurb ?? null,
    });
    console.log(
      `Hard augment --force=${forceCount} mode=${mode}: pool=${result.candidates.length} (stop=${result.stopReason}) → ${saturationDir(home)}`
    );
    return;
  }

  const priorUtterances = prior.map((c) => c.utterance);
  const priorSignatures = prior.map((c) => c.parseSignature ?? 'null');

  let raw: Array<{ id?: string; utterance: string }>;
  if (useFixture) {
    raw = [...fixtureSeed]
      .slice(0, Math.max(1, batchSize))
      .map((utterance, i) => ({ id: `fix-${i}`, utterance }));
    while (raw.length < batchSize) {
      const i = raw.length;
      raw.push({
        id: `fix-pad-${i}`,
        utterance: `fixture pad utterance ${i} unique ${stamp()}`,
      });
    }
  } else {
    const gen = await generateScenarioCandidates({
      provider: createProviderFromEnv(),
      batchSize,
      flowSteps: files.flow,
      intents: files.intents,
      inventory,
      structuredDraft,
      priorUtterances,
      productBlurb,
      mode,
    });
    if (!gen.ok) {
      console.error(gen.errors.join('\n'));
      process.exitCode = 1;
      return;
    }
    raw = gen.candidates;
  }

  const batchId = `batch-${stamp()}`;
  const { scored, summary } = scoreBatchAgainstPrior({
    batchId,
    utterances: raw.map((u, i) => ({ id: u.id ?? `${batchId}-${i}`, utterance: u.utterance })),
    priorUtterances,
    priorSignatures,
    pack,
  });

  const candidates = [...prior, ...scored];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: useFixture ? `fixture:${mode}` : mode,
    productBlurb: productBlurb ?? null,
    batches: [summary],
    plateau: false,
    priorPoolSize: prior.length,
    consecutiveNoLift: 0,
  };
  writeSaturationArtifacts(home, candidates, report, batchId, scored);
  console.log(
    `Generated ${scored.length} candidates mode=${mode} (lift=${summary.lift.toFixed(3)}, incremental=${summary.incrementalNovelty.toFixed(3)}) → ${saturationDir(home)}`
  );
}

/**
 * `uipilotCLI scenarios saturate [dir] [--batch=100] [--max-batches=N] [--fixture] [--force=N]`
 * Default batch=100 for no-lift rule (5×100). `--force=N` ignores novelty.
 */
export async function cmdScenariosSaturate(args: string[]): Promise<void> {
  const dir = positionalDir(args);
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const forceCount = parseForceCount(args);
  const bare = bareNumbers(args);
  // When --force is set, bare[0] is the force count if flags were stripped — don't use as batch
  const batchSize = Number(
    parseFlag(args, '--batch') ?? (forceCount !== undefined ? '100' : bare[0] ?? '100')
  );
  const maxBatches = Number(
    parseFlag(args, '--max-batches') ?? (forceCount !== undefined ? '1' : bare[1] ?? '50')
  );
  const useFixture = hasFlag(args, '--fixture') || process.env.UIPILOT_SATURATE_FIXTURE === '1';
  const mode = resolveGenerateMode(args);
  const files = loadPackFolderJson(home);
  const productBlurb = resolveProductBlurb(args, files);
  const pack = asIntentPack(files);
  if (!pack) {
    console.error('pack/ requires flow.json and intents.json');
    process.exitCode = 1;
    return;
  }

  const prior = loadPriorCandidates(home);
  const inventory = pathExists(join(home, 'inventory.json'))
    ? readJsonFile(join(home, 'inventory.json'))
    : undefined;
  const structuredDraft = pathExists(join(home, 'structured-draft.json'))
    ? readJsonFile(join(home, 'structured-draft.json'))
    : undefined;

  const fixtureSeed = mode === 'user-ask' ? USER_ASK_FIXTURE_SEED : FIXTURE_SEED;
  const generateBatch = useFixture
    ? fixtureBatchGenerator(fixtureSeed)
    : llmBatchGenerator({
        provider: createProviderFromEnv(),
        flowSteps: files.flow,
        intents: files.intents,
        inventory,
        structuredDraft,
        productBlurb,
        mode,
      });

  const result =
    forceCount !== undefined
      ? await runHardAugment({
          pack,
          prior,
          count: forceCount,
          chunkSize: Math.min(batchSize, forceCount),
          generateBatch,
        })
      : await runSaturationLoop({
          pack,
          prior,
          batchSize,
          maxBatches,
          generateBatch,
        });

  writeSaturationArtifacts(home, result.candidates, {
    ...result.report,
    mode: useFixture ? `fixture:${mode}` : mode,
    productBlurb: productBlurb ?? null,
  });
  console.log(
    `Saturate: ${result.batchesRun} batches, pool=${result.candidates.length}, mode=${mode}, ` +
      `stop=${result.stopReason}, plateau=${result.plateau}, noLift=${result.noLiftStop}`
  );
  for (const b of result.report.batches) {
    console.log(
      `  ${b.batchId}: lift=${b.lift.toFixed(3)} lex=${b.meanLexicalNovelty.toFixed(3)} ` +
        `incremental=${b.incrementalNovelty.toFixed(3)}`
    );
  }

  if (Array.isArray(files.scenarios) && files.manifest && files.flow && files.intents) {
    const check = checkIntents({
      pack: {
        manifest: files.manifest as { id: string },
        flow: files.flow as never,
        controls: (files.controls as never) ?? [],
        intents: files.intents as never,
        binders: files.binders as never,
      },
      scenarios: files.scenarios as never,
    });
    const failures = check.results.filter((r) => !r.ok);
    if (failures.length > 0) {
      const mined = mineIntentFailures(failures);
      appendChecklist(home, mined.checklist);
      const draftId = `sat-failures-${stamp()}`;
      const outDir = join(draftsDir(home), draftId);
      ensureDir(outDir);
      writeJsonFile(join(outDir, 'failure-hints.json'), mined.draftHints);
      writeJsonFile(join(outDir, 'meta.json'), {
        id: draftId,
        kind: 'saturation-failures',
        createdAt: new Date().toISOString(),
        checked: false,
      });
      console.log(`Mined ${failures.length} scenario failures → ${outDir}`);
    }
  }

  if (hasFlag(args, '--label') && !useFixture) {
    await softLabelAndDraft(home, files, result.candidates.slice(-batchSize), productBlurb);
  } else if (hasFlag(args, '--label') && useFixture) {
    const slice = result.candidates.slice(-batchSize);
    const draftId = `scenarios-${stamp()}`;
    const outDir = join(draftsDir(home), draftId);
    ensureDir(outDir);
    writeJsonFile(
      join(outDir, 'scenarios.json'),
      slice.map((c) => ({
        id: c.id,
        utterance: c.utterance,
        expect: { stepId: null },
      }))
    );
    writeJsonFile(join(outDir, 'meta.json'), {
      id: draftId,
      kind: 'soft-label-fixture',
      createdAt: new Date().toISOString(),
      checked: false,
    });
    console.log(`Soft-label fixture draft → ${outDir}`);
  }
}

/**
 * `uipilotCLI scenarios label-pool [dir] [--chunk=50] [--fixture]`
 * Soft-label the entire saturation/candidates.json pool in chunks → drafts/.
 */
export async function cmdScenariosLabelPool(args: string[]): Promise<void> {
  const dir = positionalDir(args);
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const chunk = Math.max(1, Number(parseFlag(args, '--chunk') ?? '50') || 50);
  const useFixture = hasFlag(args, '--fixture') || process.env.UIPILOT_SATURATE_FIXTURE === '1';
  const files = loadPackFolderJson(home);
  const productBlurb = resolveProductBlurb(args, files);
  const pool = loadPriorCandidates(home);
  if (pool.length === 0) {
    console.error('No saturation/candidates.json pool — run scenarios generate/saturate first');
    process.exitCode = 1;
    return;
  }

  if (useFixture) {
    const draftId = `scenarios-pool-${stamp()}`;
    const outDir = join(draftsDir(home), draftId);
    ensureDir(outDir);
    writeJsonFile(
      join(outDir, 'scenarios.json'),
      pool.map((c) => ({
        id: c.id,
        utterance: c.utterance,
        expect: { stepId: null },
      }))
    );
    writeJsonFile(join(outDir, 'meta.json'), {
      id: draftId,
      kind: 'soft-label-pool-fixture',
      createdAt: new Date().toISOString(),
      poolSize: pool.length,
      checked: false,
    });
    console.log(`Soft-label pool fixture draft (${pool.length}) → ${outDir}`);
    return;
  }

  const allScenarios: unknown[] = [];
  for (let i = 0; i < pool.length; i += chunk) {
    const slice = pool.slice(i, i + chunk);
    console.log(`label-pool: chunk ${i / chunk + 1} (${slice.length} of ${pool.length})…`);
    const labeled = await softLabelCandidates({
      provider: createProviderFromEnv(),
      candidates: slice,
      flowSteps: files.flow,
      intents: files.intents,
      faq: files.faq,
      productBlurb,
    });
    if (!labeled.ok) {
      console.error(labeled.errors.join('\n'));
      process.exitCode = 1;
      return;
    }
    allScenarios.push(...labeled.scenarios);
  }

  const draftId = `scenarios-pool-${stamp()}`;
  const outDir = join(draftsDir(home), draftId);
  ensureDir(outDir);
  writeJsonFile(join(outDir, 'scenarios.json'), allScenarios);
  const faqDraft = faqDraftFromSoftLabels(allScenarios as never);
  if (faqDraft.length > 0) {
    writeJsonFile(join(outDir, 'faq.json'), faqDraft);
  }
  writeJsonFile(join(outDir, 'meta.json'), {
    id: draftId,
    kind: 'soft-label-pool',
    createdAt: new Date().toISOString(),
    poolSize: pool.length,
    faqEntries: faqDraft.length,
    checked: false,
  });
  console.log(
    `Soft-label pool draft (${allScenarios.length} scenarios, ${faqDraft.length} faq) → ${outDir}`
  );
  console.log(
    'Next: merge scenarios into .uipilot/scenarios.json, review faq.json, run intents tune, then pack accept.'
  );
}

/**
 * `uipilotCLI scenarios ask [dir] --force=N --blurb="..." [--label-pool] [--fixture]`
 * Blurb-led user questions at scale (default force 5000). Does not auto-merge pack/.
 */
export async function cmdScenariosAsk(args: string[]): Promise<void> {
  const force = parseForceCount(args) ?? 5000;
  if (force < 1) {
    console.error('Usage: uipilotCLI scenarios ask [dir] --force=5000..10000 --blurb="..."');
    process.exitCode = 1;
    return;
  }
  const genArgs = args
    .filter(
      (a) =>
        a !== '--label-pool' &&
        a !== '--label' &&
        !a.startsWith('--force') &&
        !a.startsWith('--hard') &&
        a !== '--mode' &&
        !a.startsWith('--mode=')
    )
    .concat([`--force=${force}`, '--mode=user-ask']);
  console.log(`ask: generating ~${force} user questions (mode=user-ask)…`);
  await cmdScenariosGenerate(genArgs);
  if (process.exitCode && process.exitCode !== 0) return;

  if (hasFlag(args, '--label-pool') || hasFlag(args, '--label')) {
    console.log('ask: soft-labeling full candidate pool…');
    await cmdScenariosLabelPool(args);
  } else {
    console.log(
      'ask: pool ready — run `scenarios label-pool` then `intents tune` to map to intents/FAQ.'
    );
  }
}

async function softLabelAndDraft(
  home: string,
  files: Record<string, unknown>,
  candidates: ScenarioCandidate[],
  productBlurb?: string
): Promise<void> {
  const provider = createProviderFromEnv();
  const labeled = await softLabelCandidates({
    provider,
    candidates,
    flowSteps: files.flow,
    intents: files.intents,
    faq: files.faq,
    productBlurb,
  });
  const draftId = `scenarios-${stamp()}`;
  const outDir = join(draftsDir(home), draftId);
  ensureDir(outDir);
  if (!labeled.ok) {
    writeJsonFile(join(outDir, 'errors.json'), {
      errors: labeled.errors,
      checklist: labeled.checklist,
    });
    console.error(`Soft-label failed; see ${outDir}`);
    process.exitCode = 1;
    return;
  }
  writeJsonFile(join(outDir, 'scenarios.json'), labeled.scenarios);
  const faqDraft = faqDraftFromSoftLabels(labeled.scenarios);
  if (faqDraft.length > 0) {
    writeJsonFile(join(outDir, 'faq.json'), faqDraft);
  }
  writeJsonFile(join(outDir, 'meta.json'), {
    id: draftId,
    kind: 'soft-label',
    createdAt: new Date().toISOString(),
    faqEntries: faqDraft.length,
    checked: false,
  });
  console.log(`Soft-label draft → ${outDir}`);
}

/**
 * After saturate, optionally run intents tune when scenarios exist.
 * Used by `uipilotCLI tune` façade.
 */
export async function runIntentsTuneIfPossible(dir?: string): Promise<void> {
  const { home } = resolveUipilotHome(dir);
  const files = loadPackFolderJson(home);
  if (!files.scenarios || !files.intents) {
    console.log('tune: skip intents tune (need scenarios.json + pack/intents.json)');
    return;
  }
  if (process.env.UIPILOT_SATURATE_FIXTURE === '1') {
    try {
      createProviderFromEnv();
    } catch {
      console.log('tune: skip intents tune (no LLM env in fixture mode)');
      return;
    }
  }

  let failingCases: unknown[] | undefined;
  if (files.manifest && files.flow && files.intents && Array.isArray(files.scenarios)) {
    const check = checkIntents({
      pack: {
        manifest: files.manifest as { id: string },
        flow: files.flow as never,
        controls: (files.controls as never) ?? [],
        intents: files.intents as never,
        binders: files.binders as never,
      },
      scenarios: files.scenarios as never,
    });
    failingCases = check.results.filter((r) => !r.ok);
  }

  const inventory = pathExists(join(home, 'inventory.json'))
    ? readJsonFile(join(home, 'inventory.json'))
    : undefined;
  const provider = createProviderFromEnv();
  const result = await tuneIntents({
    provider,
    currentIntents: files.intents,
    scenarios: files.scenarios,
    failingCases,
    inventory,
    flowSteps: files.flow,
  });
  const draftId = `intents-${stamp()}`;
  const outDir = join(draftsDir(home), draftId);
  ensureDir(outDir);
  if (!result.ok) {
    writeJsonFile(join(outDir, 'errors.json'), {
      errors: result.errors,
      checklist: result.checklist,
    });
    console.error(`intents tune failed; see ${outDir}`);
    process.exitCode = 1;
    return;
  }
  writeJsonFile(join(outDir, 'intents.json'), result.intents);
  writeJsonFile(join(outDir, 'corpus.json'), result.corpus);
  writeJsonFile(join(outDir, 'meta.json'), {
    id: draftId,
    kind: 'intents-tune',
    createdAt: new Date().toISOString(),
    checked: false,
  });
  console.log(`intents tune draft → ${outDir}`);
}
