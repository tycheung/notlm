import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import {
  authorPackDraft,
  checkIntents,
  createProviderFromEnv,
  tuneIntents,
} from '@uipilot/author';
import {
  checklistToMarkdown,
  parseJobsYamlLite,
  writeJobsFlowDraft,
} from '@uipilot/codegen';
import {
  crawlHtml,
  crawlWithPlaywright,
  mergeGuideIdScan,
  mergeInventory,
  runStructuredExtract,
  seedCorpusFromAliases,
  seedIntentsFromSteps,
  traceToFlowDraft,
  writeTraceFile,
  type ClickTrace,
  type ControlInventory,
} from '@uipilot/mapper';
import { validatePackFolder } from '@uipilot/schema';
import {
  PACK_PIECES,
  copyTemplateFile,
  draftsDir,
  ensureDir,
  loadPackFolderJson,
  packDir,
  pathExists,
  readJsonFile,
  resolveUipilotHome,
  templateRoot,
  writeJsonFile,
} from './uipilotHome.js';

export async function cmdInit(dir?: string): Promise<void> {
  const { home } = resolveUipilotHome(dir);
  if (pathExists(home)) {
    console.error(`Already exists: ${home}`);
    process.exitCode = 1;
    return;
  }

  const template = templateRoot();
  if (!pathExists(template)) {
    console.error(`Template not found: ${template}`);
    process.exitCode = 1;
    return;
  }

  ensureDir(home);
  ensureDir(packDir(home));
  ensureDir(draftsDir(home));
  ensureDir(join(home, 'traces'));

  copyTemplateFile(join(template, 'config.json'), join(home, 'config.json'));
  copyTemplateFile(join(template, 'scenarios.json'), join(home, 'scenarios.json'));

  for (const file of PACK_PIECES) {
    const src = join(template, file);
    const dest = join(packDir(home), file);
    if (!pathExists(src)) continue;
    if (file === 'binders.json') {
      // Schema expects an array; template historically used {}.
      const raw = readJsonFile(src);
      writeJsonFile(dest, Array.isArray(raw) ? raw : []);
    } else {
      copyTemplateFile(src, dest);
    }
  }

  writeJsonFile(join(home, 'inventory.json'), {
    capturedAt: new Date().toISOString(),
    baseUrl: '',
    controls: [],
  } satisfies ControlInventory);

  writeJsonFile(join(home, 'structured-draft.json'), {
    generatedAt: new Date().toISOString(),
    steps: [],
    controls: [],
  });

  writeJsonFile(join(home, 'checklist.json'), { items: [] });

  console.log(`Initialized ${home}`);
}

export async function cmdValidate(dir?: string): Promise<void> {
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }
  const files = loadPackFolderJson(home);
  const result = validatePackFolder(files);
  if (!result.ok) {
    for (const e of result.errors) console.error(e);
    process.exitCode = 1;
    return;
  }
  console.log(`OK ${home}`);
}

export async function cmdInventoryCrawl(args: string[]): Promise<void> {
  const htmlIdx = Math.max(args.indexOf('--html'), args.indexOf('--file'));
  const urlIdx = args.indexOf('--url');
  const flagNames = new Set(['--html', '--file', '--url']);

  let htmlFile: string | undefined =
    htmlIdx >= 0 ? args[htmlIdx + 1] : undefined;
  // npm often swallows `--html`; allow bare `*.html` positional
  if (!htmlFile) {
    htmlFile = args.find((a) => /\.html?$/i.test(a) && !a.startsWith('-'));
  }

  const dir = args
    .filter((a, i) => {
      if (flagNames.has(a)) return false;
      if (i > 0 && flagNames.has(args[i - 1]!)) return false;
      if (a.startsWith('-')) return false;
      if (htmlFile && a === htmlFile) return false;
      if (urlIdx >= 0 && a === args[urlIdx + 1]) return false;
      return true;
    })
    .at(-1);

  const { home } = resolveUipilotHome(dir);

  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  let incoming: ControlInventory;
  if (htmlFile) {
    const html = readFileSync(htmlFile, 'utf8');
    incoming = crawlHtml(html, { url: htmlFile, baseUrl: htmlFile });
  } else if (urlIdx >= 0) {
    const url = args[urlIdx + 1];
    if (!url) {
      console.error('Usage: uipilotCLI inventory crawl --html <file> | --url <url> [dir]');
      process.exitCode = 1;
      return;
    }
    try {
      incoming = await crawlWithPlaywright(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/playwright is not installed/i.test(msg)) {
        console.warn('Playwright unavailable; fetching HTML with fetch()…');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
        const html = await res.text();
        incoming = crawlHtml(html, { url, baseUrl: url });
      } else {
        throw err;
      }
    }
  } else {
    console.error('Usage: uipilotCLI inventory crawl --html <file> | --url <url> [dir]');
    console.error('Tip: npm may swallow --html; use: node packages/cli/dist/cli.js inventory crawl --html <file> [dir]');
    console.error('Or pass a bare path: uipilotCLI inventory crawl path/to/page.html [dir]');
    process.exitCode = 1;
    return;
  }

  const invPath = join(home, 'inventory.json');
  const existing = pathExists(invPath)
    ? readJsonFile<ControlInventory>(invPath)
    : null;
  const merged = mergeInventory(existing, incoming);
  writeJsonFile(invPath, merged);
  console.log(`Wrote ${invPath} (${merged.controls.length} controls)`);
}

/**
 * `uipilotCLI extract static [dir] --src <path>`
 * Writes structured-draft.json, merges guide-id inventory, updates checklist.
 * Note: npm may swallow `--src`; bare path also works: `uipilotCLI extract static <src> [dir]`
 */
export async function cmdExtractStatic(args: string[]): Promise<void> {
  const flagNames = new Set(['--src']);
  const srcIdx = args.indexOf('--src');
  let srcPath = srcIdx >= 0 ? args[srcIdx + 1] : undefined;
  const positionals = args.filter((a, i) => {
    if (flagNames.has(a)) return false;
    if (i > 0 && flagNames.has(args[i - 1]!)) return false;
    if (a.startsWith('-')) return false;
    return true;
  });
  // Prefer explicit --src; else bare paths: `<srcDir> [packDir]` (npm often strips --src).
  if (!srcPath) {
    if (positionals.length >= 2) {
      srcPath = positionals[0];
    } else if (positionals.length === 1) {
      // Single path: treat as source; pack dir defaults to cwd
      srcPath = positionals[0];
    }
  }
  const dir =
    srcIdx >= 0
      ? positionalDir(args, flagNames)
      : positionals.length >= 2
        ? positionals[positionals.length - 1]
        : undefined;

  if (!srcPath) {
    console.error('Usage: uipilotCLI extract static [dir] --src <path>');
    console.error('Or:    uipilotCLI extract static <srcDir> [packDir]');
    console.error('Tip: npm may swallow --src; pass a bare source path instead.');
    process.exitCode = 1;
    return;
  }

  const { home } = resolveUipilotHome(dir && dir !== srcPath ? dir : undefined);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const sourceDir = resolve(srcPath);
  if (!pathExists(sourceDir)) {
    console.error(`Source path not found: ${sourceDir}`);
    process.exitCode = 1;
    return;
  }

  const extract = runStructuredExtract(sourceDir);
  writeJsonFile(join(home, 'structured-draft.json'), extract);

  const invPath = join(home, 'inventory.json');
  const existing = pathExists(invPath)
    ? readJsonFile<ControlInventory>(invPath)
    : null;
  const merged = mergeGuideIdScan(existing, sourceDir, {
    baseUrl: existing?.baseUrl ?? '',
  });
  writeJsonFile(invPath, merged);

  const checklistItems: Array<Record<string, unknown>> = [
    {
      id: 'extract-static-review',
      kind: 'extract',
      message: `Review structured extract from ${sourceDir} (${extract.screens.length} screens, ${extract.writeCandidates.length} write candidates, ${extract.guideIds.length} guide ids)`,
      checked: false,
    },
    {
      id: 'binders-review',
      kind: 'binders',
      message: 'Review structured-draft steps and add binders.json entries',
      checked: false,
    },
  ];
  for (const form of extract.writeCandidates) {
    checklistItems.push({
      id: `write-${form.kind}-${form.file}`.replace(/[^a-zA-Z0-9._-]+/g, '-'),
      kind: 'write-candidate',
      message: `Map ${form.kind} in ${form.file} (${form.nameHint.slice(0, 40)})`,
      checked: false,
    });
  }

  writeJsonFile(join(home, 'checklist.json'), { items: checklistItems });
  console.log(
    `Wrote structured-draft.json + inventory (${merged.controls.length} controls) + checklist (${checklistItems.length} items)`
  );
}

/**
 * `uipilotCLI trace ingest <trace.json> [dir]`
 * Saves under traces/, writes drafts/trace-<id>/flow.json + intents/corpus seeds.
 */
export async function cmdTraceIngest(args: string[]): Promise<void> {
  const traceFile = args.find((a) => !a.startsWith('-'));
  const dir = args.filter((a) => a !== traceFile && !a.startsWith('-')).at(-1);

  if (!traceFile) {
    console.error('Usage: uipilotCLI trace ingest <trace.json> [dir]');
    process.exitCode = 1;
    return;
  }

  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const abs = resolve(traceFile);
  if (!pathExists(abs)) {
    console.error(`Trace file not found: ${abs}`);
    process.exitCode = 1;
    return;
  }

  const trace = readJsonFile<ClickTrace>(abs);
  const baseName = basename(abs).replace(/\.json$/i, '');
  const traceId = baseName.startsWith('trace-') ? baseName : `trace-${baseName}`;

  const saved = writeTraceFile(home, trace, traceId);

  const { steps } = traceToFlowDraft(trace);
  const intents = seedIntentsFromSteps(steps);
  const corpus = seedCorpusFromAliases(intents.aliases);

  const draftId = `trace-${stamp()}`;
  const outDir = join(draftsDir(home), draftId);
  ensureDir(outDir);
  writeJsonFile(join(outDir, 'flow.json'), steps);
  writeJsonFile(join(outDir, 'intents.json'), intents);
  writeJsonFile(join(outDir, 'corpus.json'), corpus);
  writeJsonFile(join(outDir, 'meta.json'), {
    id: draftId,
    kind: 'trace-ingest',
    sourceTrace: saved,
    createdAt: new Date().toISOString(),
    checked: false,
    confidence: 'low',
  });

  console.log(`Ingested trace → ${saved}; draft ${outDir} (${steps.length} steps)`);
}

/**
 * `uipilotCLI jobs import <jobs.yaml|json> [dir]`
 */
export async function cmdJobsImport(args: string[]): Promise<void> {
  const jobsFile = args.find((a) => !a.startsWith('-'));
  const dir = args.filter((a) => a !== jobsFile && !a.startsWith('-')).at(-1);

  if (!jobsFile) {
    console.error('Usage: uipilotCLI jobs import <jobs.yaml|json> [dir]');
    process.exitCode = 1;
    return;
  }

  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const abs = resolve(jobsFile);
  if (!pathExists(abs)) {
    console.error(`Jobs file not found: ${abs}`);
    process.exitCode = 1;
    return;
  }

  const text = readFileSync(abs, 'utf8');
  const doc = parseJobsYamlLite(text);
  const draftId = `jobs-${stamp()}`;
  const outDir = writeJobsFlowDraft(home, doc, draftId);
  console.log(`Wrote jobs flow draft ${outDir}`);
}

/**
 * `uipilotCLI checklist md [dir]` — print or `--write` CHECKLIST.md
 */
export async function cmdChecklistMd(args: string[]): Promise<void> {
  const writeIdx = args.indexOf('--write');
  const writePath =
    writeIdx >= 0
      ? (args[writeIdx + 1] && !args[writeIdx + 1]!.startsWith('-')
          ? args[writeIdx + 1]
          : 'CHECKLIST.md')
      : undefined;
  const flagNames = new Set(['--write']);
  const dir = positionalDir(
    args.filter((a, i) => {
      if (writeIdx >= 0 && i === writeIdx + 1 && writePath && a === writePath) {
        return false;
      }
      return true;
    }),
    flagNames
  );

  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const checklistPath = join(home, 'checklist.json');
  const checklist = pathExists(checklistPath)
    ? readJsonFile(checklistPath)
    : { items: [] };
  const md = checklistToMarkdown(checklist as never);

  if (writePath) {
    const out = resolve(home, writePath);
    ensureDir(dirname(out));
    writeFileSync(out, md.endsWith('\n') ? md : `${md}\n`, 'utf8');
    console.log(`Wrote ${out}`);
  } else {
    process.stdout.write(md.endsWith('\n') ? md : `${md}\n`);
  }
}

export async function cmdDagGenerate(dir?: string): Promise<void> {
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const invPath = join(home, 'inventory.json');
  const inventory = pathExists(invPath)
    ? readJsonFile<ControlInventory>(invPath)
    : { capturedAt: new Date().toISOString(), baseUrl: '', controls: [] };

  const steps = inventory.controls.map((c) => {
    const id = (c.existingGuideId ?? c.proposedGuideId).replace(/^guide-/, '');
    return {
      id,
      title: c.name || id,
      kind: 'soft',
      requires: [] as string[],
      confidence: 'low' as const,
      sourceGuideId: c.existingGuideId ?? c.proposedGuideId,
    };
  });

  const draftControls = inventory.controls.map((c) => ({
    id: c.existingGuideId ?? c.proposedGuideId,
    role: c.role,
    name: c.name,
    selectorHint: c.selectorHint,
    path: c.url || undefined,
  }));

  const structured = {
    generatedAt: new Date().toISOString(),
    baseUrl: inventory.baseUrl,
    steps,
    controls: draftControls,
  };

  const checklistItems: Array<Record<string, unknown>> = [];
  for (const c of inventory.controls) {
    if (!c.existingGuideId) {
      checklistItems.push({
        id: `annotate-${c.proposedGuideId}`,
        kind: 'missing-guide-id',
        message: `Add data-guide-id="${c.proposedGuideId}" for ${c.role} "${c.name}"`,
        proposedGuideId: c.proposedGuideId,
        checked: false,
      });
    }
  }
  checklistItems.push({
    id: 'binders-review',
    kind: 'binders',
    message: 'Review structured-draft steps and add binders.json entries',
    checked: false,
  });

  writeJsonFile(join(home, 'structured-draft.json'), structured);
  writeJsonFile(join(home, 'checklist.json'), { items: checklistItems });
  console.log(
    `Wrote structured-draft.json (${steps.length} steps) and checklist.json (${checklistItems.length} items)`
  );
}

export async function cmdPackAuthor(dir?: string): Promise<void> {
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const inventory = pathExists(join(home, 'inventory.json'))
    ? readJsonFile(join(home, 'inventory.json'))
    : { controls: [] };
  const structuredDraft = pathExists(join(home, 'structured-draft.json'))
    ? readJsonFile(join(home, 'structured-draft.json'))
    : { steps: [] };

  const provider = createProviderFromEnv();
  const result = await authorPackDraft({ provider, inventory, structuredDraft });
  const draftId = newDraftId('pack');
  const outDir = join(draftsDir(home), draftId);
  ensureDir(outDir);

  if (!result.ok) {
    writeJsonFile(join(outDir, 'errors.json'), {
      errors: result.errors,
      checklist: result.checklist,
    });
    appendChecklist(home, result.checklist.map((m) => ({
      id: `author-error-${Date.now()}`,
      kind: 'author-error',
      message: m,
      checked: false,
    })));
    console.error(`Author failed; see ${outDir}/errors.json`);
    process.exitCode = 1;
    return;
  }

  const pieces = result.draft;
  for (const key of ['manifest', 'flow', 'controls', 'intents', 'binders', 'corpus'] as const) {
    if (pieces[key] !== undefined) {
      writeJsonFile(join(outDir, `${key}.json`), pieces[key]);
    }
  }
  writeJsonFile(join(outDir, 'meta.json'), {
    id: draftId,
    kind: 'pack-author',
    createdAt: new Date().toISOString(),
    checked: false,
  });
  console.log(`Draft written to ${outDir}`);
}

export async function cmdIntentsCheck(dir?: string): Promise<void> {
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const files = loadPackFolderJson(home);
  if (!files.manifest || !files.flow || !files.intents) {
    console.error('pack/ requires manifest.json, flow.json, intents.json');
    process.exitCode = 1;
    return;
  }

  const scenarios = (files.scenarios as unknown[]) ?? [];
  if (!Array.isArray(scenarios)) {
    console.error('scenarios.json must be an array');
    process.exitCode = 1;
    return;
  }

  const result = checkIntents({
    pack: {
      manifest: files.manifest as { id: string },
      flow: files.flow as never,
      controls: (files.controls as never) ?? [],
      intents: files.intents as never,
      binders: files.binders as never,
    },
    scenarios: scenarios as never,
  });

  for (const r of result.results) {
    const label = r.id ?? r.utterance;
    if (r.ok) {
      console.log(`PASS ${label}`);
    } else {
      console.error(`FAIL ${label}`);
      for (const e of r.errors) console.error(`  ${e}`);
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
    return;
  }
  console.log(`OK ${result.results.length} scenarios`);
}

export async function cmdIntentsTune(dir?: string): Promise<void> {
  const { home } = resolveUipilotHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing UiPilot home: ${home} (run uipilotCLI init)`);
    process.exitCode = 1;
    return;
  }

  const files = loadPackFolderJson(home);
  const scenarios = files.scenarios ?? [];
  const currentIntents = files.intents ?? { aliases: {} };
  const inventory = pathExists(join(home, 'inventory.json'))
    ? readJsonFile(join(home, 'inventory.json'))
    : undefined;

  let failingCases: unknown[] | undefined;
  if (files.manifest && files.flow && files.intents && Array.isArray(scenarios)) {
    const check = checkIntents({
      pack: {
        manifest: files.manifest as { id: string },
        flow: files.flow as never,
        controls: (files.controls as never) ?? [],
        intents: files.intents as never,
        binders: files.binders as never,
      },
      scenarios: scenarios as never,
    });
    failingCases = check.results.filter((r) => !r.ok);
  }

  const provider = createProviderFromEnv();
  const result = await tuneIntents({
    provider,
    currentIntents,
    scenarios,
    failingCases,
    inventory,
    flowSteps: files.flow,
  });

  const draftId = newDraftId('intents');
  const outDir = join(draftsDir(home), draftId);
  ensureDir(outDir);

  if (!result.ok) {
    writeJsonFile(join(outDir, 'errors.json'), {
      errors: result.errors,
      checklist: result.checklist,
    });
    console.error(`Tune failed; see ${outDir}/errors.json`);
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
  console.log(`Draft written to ${outDir}`);
}

/**
 * Merge `drafts/<draftId>/` into `pack/`.
 * Refuses unchecked drafts (meta.checked !== true) unless UIPILOT_FORCE_ACCEPT=1.
 * Always writes a pre-accept backup under the draft folder.
 */
export async function cmdPackAccept(draftId: string, dir?: string): Promise<void> {
  if (!draftId) {
    console.error('Usage: uipilotCLI pack accept <draftId>');
    process.exitCode = 1;
    return;
  }

  const { home } = resolveUipilotHome(dir);
  const draftPath = join(draftsDir(home), draftId);
  if (!pathExists(draftPath)) {
    console.error(`Draft not found: ${draftPath}`);
    process.exitCode = 1;
    return;
  }

  const metaPath = join(draftPath, 'meta.json');
  const meta = pathExists(metaPath)
    ? readJsonFile<{ checked?: boolean; kind?: string }>(metaPath)
    : { checked: false };

  const force = process.env.UIPILOT_FORCE_ACCEPT === '1';
  if (!meta.checked && !force) {
    console.error(
      `Draft ${draftId} is unchecked (meta.checked !== true). ` +
        `Review the draft, set "checked": true in meta.json, then re-run — ` +
        `or set UIPILOT_FORCE_ACCEPT=1 to override.`
    );
    process.exitCode = 1;
    return;
  }

  const backupDir = join(draftPath, `pre-accept-backup-${stamp()}`);
  ensureDir(backupDir);
  const pack = packDir(home);
  ensureDir(pack);

  const overwritten: string[] = [];
  for (const file of PACK_PIECES) {
    const fromDraft = join(draftPath, file);
    if (!pathExists(fromDraft)) continue;
    const dest = join(pack, file);
    if (pathExists(dest)) {
      copyTemplateFile(dest, join(backupDir, file));
    }
    copyTemplateFile(fromDraft, dest);
    overwritten.push(file);
  }

  writeJsonFile(join(draftPath, 'ACCEPT_NOTE.json'), {
    acceptedAt: new Date().toISOString(),
    draftId,
    backupDir,
    overwritten,
    forced: force,
  });

  writeJsonFile(metaPath, { ...meta, checked: true, acceptedAt: new Date().toISOString() });

  console.log(`Accepted ${draftId} → ${pack} (backup: ${backupDir})`);
}

function newDraftId(prefix: string): string {
  return `${prefix}-${stamp()}`;
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
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

function positionalDir(args: string[], flagNames: Set<string>): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (flagNames.has(a)) {
      i += 1;
      continue;
    }
    if (a.startsWith('-')) continue;
    return a;
  }
  return undefined;
}
