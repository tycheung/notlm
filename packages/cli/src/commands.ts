import { join } from 'node:path';
import { validatePackFolder } from '@notlm/schema';
import {
  PACK_PIECES,
  copyTemplateFile,
  draftsDir,
  ensureDir,
  loadPackFolderJson,
  packDir,
  pathExists,
  readJsonFile,
  resolveNotlmHome,
  templateRoot,
  writeJsonFile,
} from './notlmHome.js';

export async function cmdInit(dir?: string): Promise<void> {
  const { home } = resolveNotlmHome(dir);
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
  });

  writeJsonFile(join(home, 'structured-draft.json'), {
    generatedAt: new Date().toISOString(),
    steps: [],
    controls: [],
  });

  writeJsonFile(join(home, 'checklist.json'), { items: [] });

  console.log(`Initialized ${home}`);
}

export async function cmdValidate(dir?: string): Promise<void> {
  const { home } = resolveNotlmHome(dir);
  if (!pathExists(home)) {
    console.error(`Missing NotLM home: ${home} (run notlmCLI init)`);
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
