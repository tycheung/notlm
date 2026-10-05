import { describe, expect, it } from 'vitest';
import { parseSafeMarkdown, escapeHtml } from './safeMarkdown.js';

describe('safeMarkdown', () => {
  it('escapes html helpers', () => {
    expect(escapeHtml('<b>&')).toBe('&lt;b&gt;&amp;');
  });

  it('parses bold code and links', () => {
    const nodes = parseSafeMarkdown('hi **there** and `x` see [docs](https://example.com)');
    expect(nodes).toEqual([
      { type: 'text', text: 'hi ' },
      { type: 'bold', text: 'there' },
      { type: 'text', text: ' and ' },
      { type: 'code', text: 'x' },
      { type: 'text', text: ' see ' },
      { type: 'link', label: 'docs', href: 'https://example.com' },
    ]);
  });
});
