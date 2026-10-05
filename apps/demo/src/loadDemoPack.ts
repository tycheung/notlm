import type { FlowStepDef, IntentConfig, ReplyBank } from '@notlm/core';
import { loadPackFromJson, normalizeBindersMap } from '@notlm/core';

import bindersJson from '../../../packs/demo-hello/.notlm/pack/binders.json';
import controlsJson from '../../../packs/demo-hello/.notlm/pack/controls.json';
import flowJson from '../../../packs/demo-hello/.notlm/pack/flow.json';
import intentsJson from '../../../packs/demo-hello/.notlm/pack/intents.json';
import manifestJson from '../../../packs/demo-hello/.notlm/pack/manifest.json';
import repliesJson from '../../../packs/demo-hello/.notlm/pack/replies.json';

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
    binders: normalizeBindersMap(bindersJson),
    replies: repliesJson as ReplyBank,
  });
}
