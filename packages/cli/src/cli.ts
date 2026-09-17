#!/usr/bin/env node
/**
 * Thin operating CLI — pack quality gates only.
 */
import { cmdInit, cmdValidate } from './commands.js';
import { cmdIntentsCheck } from './cmdIntentsCheck.js';
import { cmdRankerCheck } from './cmdRankerCheck.js';
import { isUnsupportedCommand, unsupportedCommandMessage } from './fatDispatch.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const [cmd, sub, ...rest] = argv;

  try {
    if (isUnsupportedCommand(cmd, sub)) {
      console.error(unsupportedCommandMessage(cmd!));
      usage();
      process.exitCode = 1;
      return;
    }

    switch (cmd) {
      case 'init':
        await cmdInit(sub);
        break;
      case 'validate':
        await cmdValidate(sub);
        break;
      case 'intents':
        if (sub === 'check') await cmdIntentsCheck(rest[0]);
        else {
          usage();
          process.exitCode = 1;
        }
        break;
      case 'ranker':
        if (sub === 'check') await cmdRankerCheck(rest);
        else {
          usage();
          process.exitCode = 1;
        }
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
  uipilotCLI init [dir]
  uipilotCLI validate [dir]
  uipilotCLI intents check [dir]
  uipilotCLI ranker check [dir] [--min-hit-rate=0.75] [--min-prob=0.35]
`);
}

void main();
