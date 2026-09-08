import type { SlotBag } from '@uipilot/core';
import { DEFAULT_GUIDE_ATTR } from './fieldFlash.js';

function candidateGuideIds(slotKey: string): string[] {
  const dashed = slotKey.replace(/_/g, '-');
  return [slotKey, dashed, `guide-${slotKey}`, `guide-${dashed}`];
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
}

function setFieldValue(el: Element, value: string): boolean {
  if (el instanceof HTMLSelectElement) {
    el.focus({ preventScroll: true });
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    return false;
  }
  el.focus({ preventScroll: true });
  setNativeValue(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/**
 * Apply slot prefill to annotated inputs via `data-guide-id` (UI-actions only).
 * Tries slot key, dashed form, and `guide-` prefixes.
 */
export function applyPrefill(
  prefill: SlotBag | undefined,
  opts?: { attr?: string }
): number {
  if (!prefill) return 0;
  const attr = opts?.attr ?? DEFAULT_GUIDE_ATTR;
  let applied = 0;
  for (const [key, raw] of Object.entries(prefill)) {
    if (raw == null) continue;
    const value = String(raw);
    for (const id of candidateGuideIds(key)) {
      const el = document.querySelector(`[${attr}="${CSS.escape(id)}"]`);
      if (el && setFieldValue(el, value)) {
        applied += 1;
        break;
      }
    }
  }
  return applied;
}
