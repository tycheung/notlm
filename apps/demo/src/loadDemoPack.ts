import type {
  BinderPredicate,
  FlowStepDef,
  IntentConfig,
  ReplyBank,
} from '@notlm/core';
import { loadPackFromJson } from '@notlm/core';

import bindersJson from '../../../packs/demo-hello/.notlm/pack/binders.json';
import controlsJson from '../../../packs/demo-hello/.notlm/pack/controls.json';
import flowJson from '../../../packs/demo-hello/.notlm/pack/flow.json';
import intentsJson from '../../../packs/demo-hello/.notlm/pack/intents.json';
import manifestJson from '../../../packs/demo-hello/.notlm/pack/manifest.json';
import repliesJson from '../../../packs/demo-hello/.notlm/pack/replies.json';

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
