import { describe, expect, it } from 'vitest';
import {
  appearanceToCssVars,
  UIPILOT_CSS,
  type UiPilotAppearance,
} from './uipilot.css.js';

describe('UIPILOT_CSS tokens', () => {
  it('defines CSS variables that inherit host theme tokens', () => {
    expect(UIPILOT_CSS).toMatch(/--uipilot-accent:\s*var\(--color-primary/);
    expect(UIPILOT_CSS).toMatch(/var\(--uipilot-accent\)/);
    expect(UIPILOT_CSS).toMatch(/uipilot-chat-panel/);
    expect(UIPILOT_CSS).toMatch(/uipilot-chat-choice/);
    expect(UIPILOT_CSS).toMatch(/uipilot-fab-btn/);
    expect(UIPILOT_CSS).toMatch(/uipilot-fab-icon/);
  });

  it('maps appearance to CSS vars', () => {
    const appearance: UiPilotAppearance = {
      accent: '#0f766e',
      radius: '12px',
      font: 'Georgia, serif',
      fontSize: '15px',
      surfaceHover: '#1e293b',
    };
    expect(appearanceToCssVars(appearance)).toEqual({
      '--uipilot-accent': '#0f766e',
      '--uipilot-radius': '12px',
      '--uipilot-font': 'Georgia, serif',
      '--uipilot-font-size': '15px',
      '--uipilot-surface-hover': '#1e293b',
    });
    expect(appearanceToCssVars(undefined)).toEqual({});
  });
});