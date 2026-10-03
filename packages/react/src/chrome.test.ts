import { describe, expect, it } from 'vitest';
import {
  appearanceToCssVars,
  NOTLM_CSS,
  type NotLMAppearance,
} from './notlm.css.js';

describe('NOTLM_CSS tokens', () => {
  it('defines CSS variables that inherit host theme tokens', () => {
    expect(NOTLM_CSS).toMatch(/--notlm-accent:\s*var\(--color-primary/);
    expect(NOTLM_CSS).toMatch(/var\(--notlm-accent\)/);
    expect(NOTLM_CSS).toMatch(/notlm-chat-panel/);
    expect(NOTLM_CSS).toMatch(/notlm-chat-choice/);
    expect(NOTLM_CSS).toMatch(/notlm-fab-btn/);
    expect(NOTLM_CSS).toMatch(/notlm-fab-btn-secondary/);
    expect(NOTLM_CSS).toMatch(/notlm-fab-icon/);
    expect(NOTLM_CSS).toMatch(/notlm-checklist-panel/);
  });

  it('maps appearance to CSS vars', () => {
    const appearance: NotLMAppearance = {
      accent: '#0f766e',
      radius: '12px',
      font: 'Georgia, serif',
      fontSize: '15px',
      surfaceHover: '#1e293b',
    };
    expect(appearanceToCssVars(appearance)).toEqual({
      '--notlm-accent': '#0f766e',
      '--notlm-radius': '12px',
      '--notlm-font': 'Georgia, serif',
      '--notlm-font-size': '15px',
      '--notlm-surface-hover': '#1e293b',
    });
    expect(appearanceToCssVars(undefined)).toEqual({});
  });
});