import type {
  BinderPredicate,
  FaqEntry,
  FlowStepDef,
  GlossaryEntry,
  IntentConfig,
  LookupDef,
  ReplyBank,
} from '@uipilot/core';
import { loadPackFromJson, mergeFaqEntries } from '@uipilot/core';

import baseFaqJson from '../../../packs/_base-en/faq.json';
import bindersJson from '../../../packs/demo-todo/.uipilot/pack/binders.json';
import controlsJson from '../../../packs/demo-todo/.uipilot/pack/controls.json';
import faqJson from '../../../packs/demo-todo/.uipilot/pack/faq.json';
import flowJson from '../../../packs/demo-todo/.uipilot/pack/flow.json';
import glossaryJson from '../../../packs/demo-todo/.uipilot/pack/glossary.json';
import intentsJson from '../../../packs/demo-todo/.uipilot/pack/intents.json';
import lookupsJson from '../../../packs/demo-todo/.uipilot/pack/lookups.json';
import manifestJson from '../../../packs/demo-todo/.uipilot/pack/manifest.json';
import repliesJson from '../../../packs/demo-todo/.uipilot/pack/replies.json';

type BinderRow = BinderPredicate & { stepId: string };

function bindersArrayToRecord(rows: BinderRow[]): Record<string, BinderPredicate> {
  const out: Record<string, BinderPredicate> = {};
  for (const row of rows) {
    const { stepId, ...pred } = row;
    out[stepId] = pred as BinderPredicate;
  }
  return out;
}

export function loadDemoTodoPack() {
  return loadPackFromJson({
    manifest: manifestJson as { id: string },
    flow: flowJson as FlowStepDef[],
    controls: controlsJson as Array<{
      id: string;
      stepId: string;
      path?: string;
      spotlight?: string;
      coachMessage?: string;
      openModal?: string;
      prefill?: Record<string, unknown>;
      userFill?: string[];
    }>,
    intents: intentsJson as IntentConfig,
    binders: bindersArrayToRecord(bindersJson as BinderRow[]),
    glossary: glossaryJson as GlossaryEntry[],
    faq: mergeFaqEntries(baseFaqJson as FaqEntry[], faqJson as FaqEntry[]),
    lookups: lookupsJson as LookupDef[],
    replies: repliesJson as ReplyBank,
  });
}
