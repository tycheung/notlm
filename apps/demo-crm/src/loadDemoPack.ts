import type {
  BinderPredicate,
  FlowStepDef,
  GlossaryEntry,
  IntentConfig,
} from '@uipilot/core';
import { loadPackFromJson } from '@uipilot/core';

import bindersJson from '../../../packs/demo-crm/.uipilot/pack/binders.json';
import controlsJson from '../../../packs/demo-crm/.uipilot/pack/controls.json';
import flowJson from '../../../packs/demo-crm/.uipilot/pack/flow.json';
import glossaryJson from '../../../packs/demo-crm/.uipilot/pack/glossary.json';
import intentsJson from '../../../packs/demo-crm/.uipilot/pack/intents.json';
import manifestJson from '../../../packs/demo-crm/.uipilot/pack/manifest.json';

type BinderRow = BinderPredicate & { stepId: string };

function bindersArrayToRecord(rows: BinderRow[]): Record<string, BinderPredicate> {
  const out: Record<string, BinderPredicate> = {};
  for (const row of rows) {
    const { stepId, ...pred } = row;
    out[stepId] = pred as BinderPredicate;
  }
  return out;
}

export function loadDemoCrmPack() {
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
  });
}
