import type {
  BinderPredicate,
  FaqEntry,
  FlowStepDef,
  GlossaryEntry,
  IntentConfig,
  LookupDef,
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
  const manifest = manifestJson as { id: string };
  const flow = flowJson as FlowStepDef[];
  const controls = controlsJson as Array<{
    id: string;
    stepId: string;
    path?: string;
    spotlight?: string;
    coachMessage?: string;
    openModal?: string;
    prefill?: Record<string, unknown>;
    userFill?: string[];
  }>;
  const intents = intentsJson as IntentConfig;
  const binders = bindersArrayToRecord(bindersJson as BinderRow[]);
  const glossary = glossaryJson as GlossaryEntry[];
  const faq = mergeFaqEntries(baseFaqJson as FaqEntry[], faqJson as FaqEntry[]);
  const lookups = lookupsJson as LookupDef[];

  return loadPackFromJson({
    manifest,
    flow,
    controls,
    intents,
    binders,
    glossary,
    faq,
    lookups,
  });
}
