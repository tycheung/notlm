/**
 * Tiny safe markdown for assistant bubbles: escape HTML, then allow
 * **bold**, `code`, and [label](https://…) links. No raw HTML.
 */
const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(raw: string): string {
  return raw.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

export type SafeMdNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; label: string; href: string };

const TOKEN_RE =
  /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;

export function parseSafeMarkdown(raw: string): SafeMdNode[] {
  const nodes: SafeMdNode[] = [];
  let last = 0;
  const s = raw;
  for (const m of s.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push({ type: 'text', text: s.slice(last, idx) });
    if (m[2] != null) nodes.push({ type: 'bold', text: m[2] });
    else if (m[3] != null) nodes.push({ type: 'code', text: m[3] });
    else if (m[4] != null && m[5] != null) {
      nodes.push({ type: 'link', label: m[4], href: m[5] });
    }
    last = idx + m[0].length;
  }
  if (last < s.length) nodes.push({ type: 'text', text: s.slice(last) });
  return nodes.length ? nodes : [{ type: 'text', text: raw }];
}
