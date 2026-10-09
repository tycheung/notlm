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
  'repair.blocked': ['{{message}}'],
  'repair.ambiguous': ['{{message}}'],
  'repair.unknown': ['{{message}}'],
  'repair.low_confidence': [
    'Just to check — did you mean “{{title}}”? Say yes to continue.',
    '{{message}}',
  ],
  'repair.ood_capability': [
    'No — I am {{product_role}}. I only cover in-product workflow steps and product questions — not that request.',
    'I can’t help with that request. I am {{product_role}} and only cover this product’s workflow steps.',
  ],
  'repair.partial_ood': [
    'Okay — {{handled}}. I am {{product_role}} and cannot help with the rest of that request.',
    'I’ll handle {{handled}}, but I can’t do the rest — I am {{product_role}}.',
  ],
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
