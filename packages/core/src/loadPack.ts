import { bindersToCompleteness } from './binders.js';
import type { LoadedPack, PackJsonInput, RuntimeContextBase, StepId } from './types.js';

export function loadPackFromJson(input: PackJsonInput): LoadedPack {
  const { manifest, flow, controls, intents, binders, glossary, faq, lookups, replies } =
    input;
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
        prefill: control.prefill,
        userFill: control.userFill,
        coachCreate: control.coachCreate,
        role: control.role,
        draftKey: control.draftKey,
        beforeOpen: control.beforeOpen,
        openMenu: control.openMenu,
        confirmDialog: control.confirmDialog,
        spotlightOnly: control.spotlightOnly,
        wizardId: control.wizardId,
        wizardPage: control.wizardPage,
      };
    },
    aliases: intents.aliases,
    meta: intents.meta,
    slots: intents.slots,
    confirm: intents.confirm,
    glossary: glossary?.length ? glossary : undefined,
    faq: faq?.length ? faq : undefined,
    lookups: lookups?.length ? lookups : undefined,
    replies: replies && Object.keys(replies).length ? replies : undefined,
  };
}
