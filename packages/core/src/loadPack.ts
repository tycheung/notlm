import { bindersToCompleteness } from './binders.js';
import { compileHeuristics } from './heuristics.js';
import { buildSemanticIndex } from './semanticRetrieve.js';
import type {
  CompletenessFn,
  LoadedPack,
  NavResolve,
  PackJsonInput,
  RuntimeContextBase,
  StepId,
} from './types.js';

export function loadPackFromJson(input: PackJsonInput): LoadedPack {
  const {
    manifest,
    flow,
    controls,
    intents,
    binders,
    glossary,
    faq,
    lookups,
    replies,
    subgraphs,
    normalize,
    queries,
    mutations,
    tours,
    search,
    heuristics,
    semanticIndex: precomputedIndex,
  } = input;
  const controlByStep = new Map<StepId, (typeof controls)[number]>();
  for (const control of controls) {
    controlByStep.set(control.stepId, control);
  }

  const compiledHeuristics = compileHeuristics(heuristics, normalize);

  return {
    id: manifest.id,
    productRole: manifest.productRole,
    steps: flow,
    subgraphs: subgraphs && Object.keys(subgraphs).length ? subgraphs : undefined,
    isComplete: bindersToCompleteness(binders),
    resolveNav: (stepId: StepId, _ctx: RuntimeContextBase) => {
      const control = controlByStep.get(stepId);
      if (!control?.path) return null;
      return {
        path: control.path,
        openModal: control.openModal,
        openSurface: control.openSurface,
        surfaceStep: control.surfaceStep,
        spotlight: control.spotlight,
        coachMessage: control.coachMessage,
        prefill: control.prefill,
        userFill: control.userFill,
        coachCreate: control.coachCreate,
        role: control.role,
        draftKey: control.draftKey,
        compilerId: control.compilerId,
        beforeOpen: control.beforeOpen,
        openMenu: control.openMenu,
        confirmDialog: control.confirmDialog,
        spotlightOnly: control.spotlightOnly ?? control.instructOnly,
        instructOnly: control.instructOnly,
        wizardId: control.wizardId,
        wizardPage: control.wizardPage,
      };
    },
    aliases: intents.aliases,
    meta: intents.meta,
    metaPatterns: intents.metaPatterns?.length ? intents.metaPatterns : undefined,
    slots: intents.slots,
    confirm: intents.confirm,
    glossary: glossary?.length ? glossary : undefined,
    faq: faq?.length ? faq : undefined,
    lookups: lookups?.length ? lookups : undefined,
    replies: replies && Object.keys(replies).length ? replies : undefined,
    normalize: normalize && Object.keys(normalize).length ? normalize : undefined,
    lexicon: mergeStrLists(input.lexicon, normalize?.lexicon),
    gotoDomainTokens: mergeStrLists(input.gotoDomainTokens, normalize?.gotoDomainTokens),
    faqDomainTokens: mergeStrLists(input.faqDomainTokens, normalize?.faqDomainTokens),
    contextAskPhrases: mergeStrLists(
      input.contextAskPhrases,
      normalize?.contextAskPhrases
    ),
    explainLastPhrases: mergeStrLists(
      input.explainLastPhrases,
      normalize?.explainLastPhrases
    ),
    heuristics: heuristics && Object.keys(heuristics).length ? heuristics : undefined,
    compiledHeuristics,
    queries: queries?.length ? queries : undefined,
    mutations: mutations?.length ? mutations : undefined,
    tours: tours?.length ? tours : undefined,
    search: search?.length ? search : undefined,
    semanticIndex:
      precomputedIndex?.docs?.length
        ? precomputedIndex
        : faq?.length || queries?.length
          ? buildSemanticIndex({ faq, queries })
          : undefined,
  };
}

function mergeStrLists(
  a?: string[] | null,
  b?: string[] | null
): string[] | undefined {
  const out = [...(a ?? []), ...(b ?? [])].map((s) => s.trim()).filter(Boolean);
  return out.length ? [...new Set(out)] : undefined;
}

export type PackOverlays = {
  resolveNav?: (
    stepId: StepId,
    ctx: RuntimeContextBase,
    baseResolve: (stepId: StepId, ctx: RuntimeContextBase) => NavResolve | null
  ) => NavResolve | null;
  unavailableReason?: (
    stepId: StepId,
    ctx: RuntimeContextBase,
    base?: (stepId: StepId, ctx: RuntimeContextBase) => string | null
  ) => string | null;
  /** Merge/override completeness fns; missing keys keep the base. */
  isComplete?: Partial<Record<StepId, CompletenessFn>>;
};

/** Host overlay for dynamic nav / availability without forking LoadedPack by hand. */
export function wrapPack(base: LoadedPack, overlays: PackOverlays): LoadedPack {
  const baseResolve = base.resolveNav.bind(base);
  const baseUnavailable = base.unavailableReason?.bind(base);

  return {
    ...base,
    isComplete: overlays.isComplete
      ? ({ ...base.isComplete, ...overlays.isComplete } as typeof base.isComplete)
      : base.isComplete,
    resolveNav: overlays.resolveNav
      ? (stepId, ctx) => overlays.resolveNav!(stepId, ctx, baseResolve)
      : base.resolveNav,
    unavailableReason: overlays.unavailableReason
      ? (stepId, ctx) => overlays.unavailableReason!(stepId, ctx, baseUnavailable)
      : base.unavailableReason,
  };
}
