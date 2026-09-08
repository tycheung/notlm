import { bindersToCompleteness } from './binders.js';
import type { LoadedPack, PackJsonInput, RuntimeContextBase, StepId } from './types.js';

export function loadPackFromJson(input: PackJsonInput): LoadedPack {
  const { manifest, flow, controls, intents, binders } = input;
  const controlByStep = new Map<StepId, (typeof controls)[number]>();
  for (const control of controls) {
    controlByStep.set(control.stepId, control);
  }

  return {
    id: manifest.id,
    steps: flow,
    isComplete: bindersToCompleteness(binders),
    resolveNav: (stepId: StepId, _ctx: RuntimeContextBase) => {
      const control = controlByStep.get(stepId);
      if (!control?.path) return null;
      return {
        path: control.path,
        openModal: control.openModal,
        spotlight: control.spotlight,
        coachMessage: control.coachMessage,
      };
    },
    aliases: intents.aliases,
    meta: intents.meta,
  };
}
