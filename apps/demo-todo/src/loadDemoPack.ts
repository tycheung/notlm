import type {
  FaqEntry,
  FlowStepDef,
  GlossaryEntry,
  IntentConfig,
  LookupDef,
  ReplyBank,
} from '@notlm/core';
import { loadPackFromJson, mergeFaqEntries, normalizeBindersMap } from '@notlm/core';

import baseFaqJson from '../../../packs/_base-en/faq.json';
import bindersJson from '../../../packs/demo-todo/.notlm/pack/binders.json';
import controlsJson from '../../../packs/demo-todo/.notlm/pack/controls.json';
import faqJson from '../../../packs/demo-todo/.notlm/pack/faq.json';
import flowJson from '../../../packs/demo-todo/.notlm/pack/flow.json';
import glossaryJson from '../../../packs/demo-todo/.notlm/pack/glossary.json';
import intentsJson from '../../../packs/demo-todo/.notlm/pack/intents.json';
import lookupsJson from '../../../packs/demo-todo/.notlm/pack/lookups.json';
import manifestJson from '../../../packs/demo-todo/.notlm/pack/manifest.json';
import repliesJson from '../../../packs/demo-todo/.notlm/pack/replies.json';

export function loadDemoTodoPack() {
  return loadPackFromJson({
    manifest: manifestJson as { id: string },
    flow: flowJson as FlowStepDef[],
    controls: controlsJson as never,
    intents: intentsJson as IntentConfig,
    binders: normalizeBindersMap(bindersJson),
    glossary: glossaryJson as GlossaryEntry[],
    faq: mergeFaqEntries(baseFaqJson as FaqEntry[], faqJson as FaqEntry[]),
    lookups: lookupsJson as LookupDef[],
    replies: repliesJson as ReplyBank,
  });
}
