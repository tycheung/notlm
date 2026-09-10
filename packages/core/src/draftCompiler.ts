import type {
  DraftCompileResult,
  DraftCompiler,
  SessionSlots,
  SlotBag,
  StepId,
} from './types.js';
import { patchStepSlots } from './slots.js';

export type DraftCompilerRun = {
  handled: boolean;
  session: SessionSlots;
  summary?: string;
  missing?: Array<{ key: string; label: string }>;
  finishRequested?: boolean;
  draftKey?: string;
  draft?: SlotBag;
  stepId?: StepId;
};

/**
 * Try host-registered draft compilers for the active (or target) step.
 */
export function runDraftCompiler(opts: {
  text: string;
  stepId: StepId;
  compilerId: string | undefined;
  draftKey: string | undefined;
  compilers: Record<string, DraftCompiler> | undefined;
  session: SessionSlots;
}): DraftCompilerRun {
  const { text, stepId, compilerId, draftKey, compilers, session } = opts;
  if (!compilerId || !compilers?.[compilerId]) {
    return { handled: false, session };
  }
  const compiler = compilers[compilerId]!;
  if (!compiler.match(text)) {
    return { handled: false, session };
  }
  const key = draftKey ?? stepId;
  const current = (session.byStep[stepId] ?? null) as SlotBag | null;
  const compiled: DraftCompileResult | null = compiler.compile(text, current);
  if (!compiled) {
    return { handled: false, session };
  }
  const bag: SlotBag = { ...compiled.draft };
  if (draftKey && bag[draftKey] === undefined) {
    bag[draftKey] = compiled.draft;
  }
  const next = patchStepSlots(session, stepId, bag);
  const missing = compiler.listMissing(compiled.draft);
  return {
    handled: true,
    session: next,
    summary: compiled.summary,
    missing,
    finishRequested: compiled.finishRequested,
    draftKey: key,
    draft: compiled.draft,
    stepId,
  };
}
