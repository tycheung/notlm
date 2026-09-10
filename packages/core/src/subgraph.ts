import type {
  FlowStepDef,
  PackRuntime,
  SessionSlots,
  StepId,
} from './types.js';

export function getSubgraphSteps(
  pack: PackRuntime,
  subgraphId: string
): FlowStepDef[] {
  return pack.subgraphs?.[subgraphId] ?? [];
}

export function findParentStepForSubgraph(
  pack: PackRuntime,
  subgraphId: string
): FlowStepDef | undefined {
  return pack.steps.find((s) => s.subgraph === subgraphId);
}

/** Steps considered live for NLU when a subgraph is active (child steps only). */
export function activeFlowSteps(pack: PackRuntime, session: SessionSlots): FlowStepDef[] {
  const id = session.activeSubgraphId;
  if (!id) return pack.steps;
  const child = getSubgraphSteps(pack, id);
  return child.length > 0 ? child : pack.steps;
}

export function enterSubgraph(
  session: SessionSlots,
  parentStepId: StepId,
  subgraphId: string
): SessionSlots {
  const stack = [...(session.subgraphStack ?? [])];
  if (session.activeSubgraphId) {
    // Keep outer parents on the stack.
  }
  stack.push(parentStepId);
  return {
    ...session,
    activeSubgraphId: subgraphId,
    subgraphStack: stack,
    activeStep: parentStepId,
  };
}

export function exitSubgraph(session: SessionSlots): SessionSlots {
  const stack = [...(session.subgraphStack ?? [])];
  stack.pop();
  return {
    ...session,
    subgraphStack: stack,
    activeSubgraphId: null,
  };
}

/**
 * Parent subgraph step is complete when every hard child step is complete
 * (or there are no children).
 */
export function isSubgraphComplete(
  pack: PackRuntime,
  subgraphId: string,
  isComplete: (stepId: StepId) => boolean
): boolean {
  const children = getSubgraphSteps(pack, subgraphId);
  if (children.length === 0) return false;
  const hard = children.filter((s) => s.kind === 'hard' || s.kind === 'conditional');
  const targets = hard.length > 0 ? hard : children;
  return targets.every((s) => isComplete(s.id));
}

export function maybeCompleteParentSubgraph(
  pack: PackRuntime,
  session: SessionSlots,
  completedChildId: StepId
): { session: SessionSlots; completedParent: StepId | null } {
  const subgraphId = session.activeSubgraphId;
  if (!subgraphId) return { session, completedParent: null };
  const children = getSubgraphSteps(pack, subgraphId);
  if (!children.some((s) => s.id === completedChildId)) {
    return { session, completedParent: null };
  }
  const complete = (id: StepId) =>
    Boolean(pack.isComplete[id]?.({ pathname: '', data: session.flags })) ||
    session.history.includes(id) ||
    id === completedChildId;
  // Prefer binder-driven completeness via a host-updated session flag bag is weak;
  // callers should pass real ctx via notify — here we only exit when stack asks.
  if (!isSubgraphComplete(pack, subgraphId, (id) => complete(id))) {
    return { session, completedParent: null };
  }
  const parent = findParentStepForSubgraph(pack, subgraphId);
  const next = exitSubgraph(session);
  return { session: next, completedParent: parent?.id ?? null };
}
