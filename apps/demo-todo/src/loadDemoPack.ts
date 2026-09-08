import type { BinderPredicate, FlowStepDef, IntentConfig } from '@uipilot/core';
import { loadPackFromJson } from '@uipilot/core';

import bindersJson from '../../../packs/demo-todo/.uipilot/pack/binders.json';
import controlsJson from '../../../packs/demo-todo/.uipilot/pack/controls.json';
import flowJson from '../../../packs/demo-todo/.uipilot/pack/flow.json';
import intentsJson from '../../../packs/demo-todo/.uipilot/pack/intents.json';
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
  }>;
  const intents = intentsJson as IntentConfig;
  const binders = bindersArrayToRecord(bindersJson as BinderRow[]);

  return loadPackFromJson({
    manifest,
    flow,
    controls,
    intents,
    binders,
  });
}
