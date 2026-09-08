import type { DiscourseState, ReplyBank, SessionSlots } from './types.js';

const DEFAULTS: ReplyBank = {
  launch: ['Taking you to “{{title}}”.', 'Okay — opening “{{title}}”.', 'On it — “{{title}}”.'],
  confirm: [
    'I’ll open “{{title}}” — sound good?',
    'Ready to go to “{{title}}”? Say yes to continue.',
  ],
  proactive: [
    'Nice — “{{done}}” is done. Next up looks like “{{title}}”. Want me to take you there?',
    '“{{done}}” looks complete. Shall I open “{{title}}” next?',
  ],
  ask_slot: ['{{prompt}}'],
  blocked: ['{{message}}'],
  cancel: ['Okay, cancelled.', 'No problem — say what’s next whenever you’re ready.'],
  affirm_skip: ['Alright — just say when you want to continue.'],
};

export function renderTemplate(
  template: string,
  vars: Record<string, string | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/**
 * Pick a reply variant (step-specific key, then generic, then default).
 * Advances discourse.replyCursor for mild variety.
 */
export function pickReply(
  session: SessionSlots,
  bank: ReplyBank | undefined,
  key: string,
  vars: Record<string, string | undefined> = {}
): { text: string; session: SessionSlots } {
  const merged: ReplyBank = { ...DEFAULTS, ...(bank ?? {}) };
  const stepKey = vars.stepId ? `${key}.${vars.stepId}` : null;
  const variants =
    (stepKey && merged[stepKey]?.length ? merged[stepKey] : null) ??
    merged[key] ??
    DEFAULTS[key] ??
    ['…'];
  const cursor = session.discourse?.replyCursor ?? 0;
  const text = renderTemplate(variants[cursor % variants.length]!, vars);
  const discourse: DiscourseState = {
    ...(session.discourse ?? {}),
    replyCursor: cursor + 1,
  };
  return { text, session: { ...session, discourse } };
}

export function isAffirmative(text: string): boolean {
  return /^(yes|yep|yeah|y|ok|okay|sure|sounds good|do it|please|go ahead|ye)\b/i.test(
    text.trim()
  );
}

export function isNegative(text: string): boolean {
  return /^(no|nope|nah|cancel|not now|skip|don't|dont|later)\b/i.test(text.trim());
}
