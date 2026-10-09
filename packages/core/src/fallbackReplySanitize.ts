/**
 * Reject raw provider tokens / echo / garbage so the chat never shows them.
 */

const RAW_TOKEN_RE =
  /^(?:string|refuse|Refuse|FAQ|faq|goto|meta|query|mutation|tour|search|null|undefined|NaN|true|false|type\s*=\s*\w+)$/i;

const IMAGE_REFUSAL_RE =
  /\b(?:cannot|can't|can not|unable to|am unable to)\s+view\s+images?\b|\b(?:provide|describe)\s+(?:a\s+)?(?:text\s+)?description\b|\bplease describe the image\b/i;

/** Provider leaked intent labels / debug tokens into the user-visible reply. */
const LEAKED_INTENT_RE =
  /^(?:Refuse|refuse|FAQ|faq|goto|meta)\b[,:]|\bnot mappable to the catalog\b|\bproposed\.type\s*=/i;

export function isGarbageFallbackReply(
  reply: string | null | undefined,
  userText?: string
): boolean {
  const t = (reply ?? '').trim();
  if (!t) return true;
  if (RAW_TOKEN_RE.test(t)) return true;
  if (IMAGE_REFUSAL_RE.test(t)) return true;
  if (LEAKED_INTENT_RE.test(t)) return true;
  if (/^type\s*=/i.test(t) && t.length < 40) return true;
  const user = (userText ?? '').trim();
  if (user && t.toLowerCase() === user.toLowerCase()) return true;
  // Near-echo: reply is the user text with trivial punctuation changes.
  if (
    user.length > 8 &&
    t.length <= user.length + 4 &&
    t.toLowerCase().replace(/[^a-z0-9]+/g, '') ===
      user.toLowerCase().replace(/[^a-z0-9]+/g, '')
  ) {
    return true;
  }
  // Refuse templates that paste a long slice of the user utterance after "help with".
  if (user.length > 12) {
    const helpIdx = t.toLowerCase().indexOf('help with ');
    if (helpIdx >= 0) {
      const after = t.slice(helpIdx + 'help with '.length).replace(/[.!?].*$/, '').trim();
      const userNorm = user.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const afterNorm = after.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (afterNorm.length >= 10 && userNorm.includes(afterNorm)) return true;
    }
  }
  return false;
}

export const FALLBACK_UNAVAILABLE_REPLY =
  "I couldn't answer that just now. Try rephrasing, or ask for a checklist step by name.";

/**
 * Return null when the reply should be replaced with a local fallback message.
 */
export function sanitizeFallbackReply(
  reply: string | null | undefined,
  userText?: string
): string | null {
  if (isGarbageFallbackReply(reply, userText)) return null;
  return (reply ?? '').trim();
}
