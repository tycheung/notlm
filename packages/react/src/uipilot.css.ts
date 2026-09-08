import { DEFAULT_FLASH_CLASS } from './fieldFlash.js';

/**
 * Minimal host chrome styles. Inject once: `style.textContent = UIPILOT_CSS`.
 * Override via CSS variables on `.uipilot-host-root` or `appearance` prop.
 *
 * Stable class contract (hosts may override in their CSS):
 * - uipilot-host-root, uipilot-fab-root, uipilot-fab-btn
 * - uipilot-chat-panel, uipilot-chat-header, uipilot-chat-close
 * - uipilot-chat-messages, uipilot-chat-bubble, uipilot-chat-bubble-user|assistant
 * - uipilot-chat-input-row, uipilot-chat-input, uipilot-chat-btn, uipilot-chat-btn-primary|listening
 * - uipilot-palette-backdrop|scrim|panel|input|list|item|item-active
 * - uipilot-spotlight-root|scrim|ring|card
 */
export const UIPILOT_CSS = `
.uipilot-host-root {
  --uipilot-accent: #2563eb;
  --uipilot-accent-soft: #93c5fd;
  --uipilot-surface: #fff;
  --uipilot-surface-muted: #f9fafb;
  --uipilot-surface-hover: #f3f4f6;
  --uipilot-border: #d1d5db;
  --uipilot-border-muted: #e5e7eb;
  --uipilot-text: #111827;
  --uipilot-text-muted: #6b7280;
  --uipilot-danger-bg: #fef2f2;
  --uipilot-danger-text: #b91c1c;
  --uipilot-radius: 0.75rem;
  --uipilot-radius-sm: 0.375rem;
  --uipilot-font: system-ui, sans-serif;
  --uipilot-fab-offset-bottom: 1rem;
  --uipilot-fab-offset-right: 1rem;
  --uipilot-z-chat: 11000;
  --uipilot-z-palette: 11050;
  font-family: var(--uipilot-font);
  color: var(--uipilot-text);
}
.uipilot-palette-backdrop { position: fixed; inset: 0; z-index: var(--uipilot-z-palette); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; padding-inline: 1rem; }
.uipilot-palette-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.4); border: 0; cursor: pointer; }
.uipilot-palette-panel { position: relative; width: min(100%, 32rem); border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-border); background: var(--uipilot-surface); box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; }
.uipilot-palette-input { width: 100%; border: 0; outline: none; padding: 0.75rem 1rem; font-size: 0.875rem; background: transparent; color: var(--uipilot-text); }
.uipilot-palette-list { max-height: 20rem; overflow-y: auto; margin: 0; padding: 0.25rem 0; list-style: none; }
.uipilot-palette-item { width: 100%; text-align: left; padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 0; background: transparent; cursor: pointer; color: var(--uipilot-text); }
.uipilot-palette-item:hover, .uipilot-palette-item-active { background: var(--uipilot-surface-hover); }
.uipilot-palette-item:disabled { opacity: 0.65; cursor: not-allowed; }
.uipilot-fab-root { position: fixed; bottom: var(--uipilot-fab-offset-bottom); right: var(--uipilot-fab-offset-right); z-index: var(--uipilot-z-chat); display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
.uipilot-chat-panel { width: min(calc(100vw - 2rem), 24rem); height: min(90vh, 34rem); display: flex; flex-direction: column; border-radius: var(--uipilot-radius); border: 1px solid var(--uipilot-border); background: var(--uipilot-surface); box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; }
.uipilot-chat-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--uipilot-border-muted); background: var(--uipilot-surface-muted); font-weight: 600; }
.uipilot-chat-close { border: 0; background: transparent; cursor: pointer; color: var(--uipilot-text-muted); font-size: 1.25rem; line-height: 1; padding: 0.25rem 0.5rem; }
.uipilot-chat-messages { flex: 1; overflow-y: auto; padding: 0.5rem 0.75rem; min-height: 0; }
.uipilot-chat-bubble { border-radius: var(--uipilot-radius-sm); padding: 0.375rem 0.625rem; max-width: 95%; white-space: pre-wrap; font-size: 0.8125rem; margin-bottom: 0.5rem; }
.uipilot-chat-bubble-user { margin-left: auto; background: var(--uipilot-accent); color: #fff; }
.uipilot-chat-bubble-assistant { margin-right: auto; background: var(--uipilot-surface-hover); color: var(--uipilot-text); }
.uipilot-chat-input-row { display: flex; gap: 0.25rem; align-items: flex-end; padding: 0.5rem; border-top: 1px solid var(--uipilot-border-muted); }
.uipilot-chat-input { flex: 1; resize: none; border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-border); padding: 0.375rem 0.5rem; font-size: 0.8125rem; background: var(--uipilot-surface); color: var(--uipilot-text); }
.uipilot-chat-btn { border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-border); padding: 0.375rem 0.625rem; cursor: pointer; background: var(--uipilot-surface-muted); color: var(--uipilot-text); }
.uipilot-chat-btn-primary { background: var(--uipilot-accent); color: #fff; border-color: var(--uipilot-accent); font-weight: 600; }
.uipilot-chat-btn-listening { background: var(--uipilot-danger-bg); color: var(--uipilot-danger-text); }
.uipilot-fab-btn { border-radius: 9999px; border: 0; padding: 0.875rem; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.15); background: var(--uipilot-accent); color: #fff; font-size: 1.25rem; }
.uipilot-spotlight-root { position: fixed; inset: 0; z-index: 80; }
.uipilot-spotlight-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.5); border: 0; cursor: default; }
.uipilot-spotlight-ring { pointer-events: none; position: absolute; border-radius: var(--uipilot-radius-sm); box-shadow: 0 0 0 4px var(--uipilot-accent), 0 0 0 9999px rgba(0,0,0,0.45); }
.uipilot-spotlight-card { position: absolute; z-index: 81; max-width: 20rem; border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-border); background: var(--uipilot-surface); padding: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.15); font-size: 0.875rem; color: var(--uipilot-text); }
.${DEFAULT_FLASH_CLASS} { animation: uipilot-field-flash 0.7s ease-in-out 3; outline: 2px solid var(--uipilot-accent); outline-offset: 2px; }
@keyframes uipilot-field-flash { 0%, 100% { outline-color: var(--uipilot-accent); } 50% { outline-color: var(--uipilot-accent-soft); } }
`;

export { DEFAULT_FLASH_CLASS };

export type UiPilotAppearance = {
  accent?: string;
  accentSoft?: string;
  surface?: string;
  surfaceMuted?: string;
  border?: string;
  text?: string;
  textMuted?: string;
  radius?: string;
  font?: string;
  fabOffsetBottom?: string;
  fabOffsetRight?: string;
};

export type UiPilotChromeSlot =
  | 'root'
  | 'fabRoot'
  | 'fabButton'
  | 'chatPanel'
  | 'chatHeader'
  | 'chatMessages'
  | 'chatInput'
  | 'paletteBackdrop'
  | 'palettePanel';

export function appearanceToCssVars(
  appearance?: UiPilotAppearance
): Record<string, string> {
  if (!appearance) return {};
  const map: Record<string, string | undefined> = {
    '--uipilot-accent': appearance.accent,
    '--uipilot-accent-soft': appearance.accentSoft,
    '--uipilot-surface': appearance.surface,
    '--uipilot-surface-muted': appearance.surfaceMuted,
    '--uipilot-border': appearance.border,
    '--uipilot-text': appearance.text,
    '--uipilot-text-muted': appearance.textMuted,
    '--uipilot-radius': appearance.radius,
    '--uipilot-font': appearance.font,
    '--uipilot-fab-offset-bottom': appearance.fabOffsetBottom,
    '--uipilot-fab-offset-right': appearance.fabOffsetRight,
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined && v !== '') out[k] = v;
  }
  return out;
}
