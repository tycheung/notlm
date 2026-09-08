import type {
  BinderPredicate,
  FlowStepDef,
  IntentConfig,
  ReplyBank,
} from '@uipilot/core';
import { loadPackFromJson } from '@uipilot/core';

import bindersJson from '../../../packs/demo-hello/.uipilot/pack/binders.json';
import controlsJson from '../../../packs/demo-hello/.uipilot/pack/controls.json';
import flowJson from '../../../packs/demo-hello/.uipilot/pack/flow.json';
import intentsJson from '../../../packs/demo-hello/.uipilot/pack/intents.json';
import manifestJson from '../../../packs/demo-hello/.uipilot/pack/manifest.json';
import repliesJson from '../../../packs/demo-hello/.uipilot/pack/replies.json';

type BinderRow = BinderPredicate & { stepId: string };

function bindersArrayToRecord(rows: BinderRow[]): Record<string, BinderPredicate> {
  const out: Record<string, BinderPredicate> = {};
  for (const row of rows) {
    const { stepId, ...pred } = row;
    out[stepId] = pred as BinderPredicate;
  }
  return out;
}

export function loadDemoHelloPack() {
  return loadPackFromJson({
    manifest: manifestJson as { id: string },
    flow: flowJson as FlowStepDef[],
    controls: controlsJson as Array<{
      id: string;
      stepId: string;
      path?: string;
      spotlight?: string;
      coachMessage?: string;
    }>,
    intents: intentsJson as IntentConfig,
    binders: bindersArrayToRecord(bindersJson as BinderRow[]),
    replies: repliesJson as ReplyBank,
  });
}
