import type {
  FlowStepDef,
  GlossaryEntry,
  IntentConfig,
  ReplyBank,
} from '@notlm/core';
import { loadPackFromJson, normalizeBindersMap } from '@notlm/core';

import bindersJson from '../../../packs/demo-crm/.notlm/pack/binders.json';
import controlsJson from '../../../packs/demo-crm/.notlm/pack/controls.json';
import flowJson from '../../../packs/demo-crm/.notlm/pack/flow.json';
import glossaryJson from '../../../packs/demo-crm/.notlm/pack/glossary.json';
import intentsJson from '../../../packs/demo-crm/.notlm/pack/intents.json';
import manifestJson from '../../../packs/demo-crm/.notlm/pack/manifest.json';
import repliesJson from '../../../packs/demo-crm/.notlm/pack/replies.json';

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
    binders: normalizeBindersMap(bindersJson),
    glossary: glossaryJson as GlossaryEntry[],
    replies: repliesJson as ReplyBank,
  });
}
