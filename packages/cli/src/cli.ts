#!/usr/bin/env node
import {
  cmdChecklistMd,
  cmdDagGenerate,
  cmdExtractStatic,
  cmdInit,
  cmdIntentsCheck,
  cmdIntentsTune,
  cmdInventoryCrawl,
  cmdJobsImport,
  cmdPackAccept,
  cmdPackAuthor,
  cmdTraceIngest,
  cmdValidate,
} from './commands.js';
import { cmdMap, cmdPrepare, cmdTune } from './cmdMapTunePrepare.js';
import { cmdScenariosGenerate, cmdScenariosSaturate } from './cmdScenarios.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const [cmd, sub, ...rest] = argv;

  try {
    switch (cmd) {
      case 'init':
        await cmdInit(sub);
        break;
      case 'validate':
        await cmdValidate(sub);
        break;
      case 'inventory':
        if (sub !== 'crawl') {
          usage();
          process.exitCode = 1;
          return;
        }
        await cmdInventoryCrawl(rest);
        break;
      case 'extract':
        if (sub !== 'static') {
          usage();
          process.exitCode = 1;
          return;
        }
        await cmdExtractStatic(rest);
        break;
      case 'trace':
        if (sub !== 'ingest') {
          usage();
          process.exitCode = 1;
          return;
        }
        await cmdTraceIngest(rest);
        break;
      case 'jobs':
        if (sub !== 'import') {
          usage();
          process.exitCode = 1;
          return;
        }
        await cmdJobsImport(rest);
        break;
      case 'checklist':
        if (sub !== 'md') {
          usage();
          process.exitCode = 1;
          return;
        }
        await cmdChecklistMd(rest);
        break;
      case 'dag':
        if (sub !== 'generate') {
          usage();
          process.exitCode = 1;
          return;
        }
        await cmdDagGenerate(rest[0]);
        break;
      case 'pack':
        if (sub === 'author') {
          await cmdPackAuthor(rest[0]);
        } else if (sub === 'accept') {
          await cmdPackAccept(rest[0]!, rest[1]);
        } else {
          usage();
          process.exitCode = 1;
        }
        break;
      case 'intents':
        if (sub === 'check') {
          await cmdIntentsCheck(rest[0]);
        } else if (sub === 'tune') {
          await cmdIntentsTune(rest[0]);
        } else {
          usage();
          process.exitCode = 1;
        }
        break;
      case 'scenarios':
        if (sub === 'generate') {
          await cmdScenariosGenerate(rest);
        } else if (sub === 'saturate') {
          await cmdScenariosSaturate(rest);
        } else {
          usage();
          process.exitCode = 1;
        }
        break;
      case 'map':
        await cmdMap([sub, ...rest].filter((x) => x !== undefined) as string[]);
        break;
      case 'tune':
        await cmdTune([sub, ...rest].filter((x) => x !== undefined) as string[]);
        break;
      case 'prepare':
        await cmdPrepare([sub, ...rest].filter((x) => x !== undefined) as string[]);
        break;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        usage();
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        usage();
        process.exitCode = 1;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    process.exitCode = 1;
  }
}

function usage(): void {
  console.log(`Usage:
  Primary (ADR-006):
  uipilotCLI map [dir] [--src <path>] [--llm]
  uipilotCLI tune [dir] [--fixture] [--batch=N] [--force=N] [--label]
  uipilotCLI prepare [dir] [--llm] [--fixture]

  Saturation (ADR-005):
  uipilotCLI scenarios generate [dir] --batch=N [--fixture] [--force=N]
  uipilotCLI scenarios saturate [dir] [--batch=100] [--max-batches=N] [--fixture] [--force=N] [--label]
  Tip: npm may strip --flags; prefer --batch=100 / --force=10000 or UIPILOT_SATURATE_FIXTURE=1
  No-lift stop: 5 consecutive passes of 100 with no parse-signature lift (even if wording looks diverse)
  --force=N / --hard=N: hard-add exactly N (ignore similarity / plateau)

  Atomic:
  uipilotCLI init [dir]
  uipilotCLI validate [dir]
  uipilotCLI inventory crawl --html <file> | --url <url> [dir]
  uipilotCLI extract static [dir] --src <path>
  uipilotCLI trace ingest <trace.json> [dir]
  uipilotCLI jobs import <jobs.yaml|json> [dir]
  uipilotCLI checklist md [dir] [--write [CHECKLIST.md]]
  uipilotCLI dag generate [dir]
  uipilotCLI pack author [dir]
  uipilotCLI intents check [dir]
  uipilotCLI intents tune [dir]
  uipilotCLI pack accept <draftId> [dir]
`);
}

void main();
