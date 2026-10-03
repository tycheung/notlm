import { DEFAULT_FLASH_CLASS } from './fieldFlash.js';

/**
 * Minimal host chrome styles. Inject once: `style.textContent = NOTLM_CSS`.
 *
 * Defaults inherit from the host document’s CSS variables when present, so a
 * transplanted pack picks up the product theme without hard-coding colors.
 * Pass `appearance` (or set `--notlm-*` on `.notlm-host-root`) to override
 * fonts, colors, radii, and FAB offsets.
 *
 * Host token fallbacks (first match wins):
 * - accent: --color-primary | --primary
 * - surface: --color-surface | --surface
 * - text: --color-text | --text
 * - font: --font-ui | --font-family
 *
 * Stable class contract (hosts may override in their CSS):
 * - notlm-host-root, notlm-fab-root, notlm-fab-btn, notlm-fab-btn-secondary
 * - notlm-checklist-fab (stacked above assistant in fab-root)
 * - notlm-chat-panel, notlm-chat-header, notlm-chat-close
 * - notlm-chat-messages, notlm-chat-bubble, notlm-chat-bubble-user|assistant
 * - notlm-chat-turn, notlm-chat-choices, notlm-chat-choice
 * - notlm-chat-input-row, notlm-chat-input, notlm-chat-btn, notlm-chat-btn-primary|listening
 * - notlm-checklist-root|backdrop|panel|header|close|list|item|row|title|phase|state
 * - notlm-palette-backdrop|scrim|panel|input|list|item|item-active
 * - notlm-spotlight-root|scrim|ring|card
 */
export const NOTLM_CSS = `
.notlm-host-root {
  --notlm-accent: var(--color-primary, var(--primary, #2563eb));
  --notlm-accent-soft: var(--color-primary-light, var(--primary-light, #93c5fd));
  --notlm-surface: var(--color-surface, var(--surface, #ffffff));
  --notlm-surface-muted: var(--color-surface-muted, var(--surface-muted, var(--color-surface-light, #f9fafb)));
  --notlm-surface-hover: var(--color-surface-hover, var(--surface-hover, var(--color-surface-light, #f3f4f6)));
  --notlm-border: var(--color-border, var(--border, #d1d5db));
  --notlm-border-muted: var(--color-border-muted, var(--border-muted, #e5e7eb));
  --notlm-text: var(--color-text, var(--text, #111827));
  --notlm-text-muted: var(--color-text-muted, var(--text-muted, #6b7280));
  --notlm-danger-bg: var(--color-danger-bg, #fef2f2);
  --notlm-danger-text: var(--color-danger, var(--danger, #b91c1c));
  --notlm-on-accent: var(--color-on-primary, #ffffff);
  --notlm-radius: var(--radius-card, 0.75rem);
  --notlm-radius-sm: var(--radius-input, 0.375rem);
  --notlm-font: var(--font-ui, var(--font-family, system-ui, sans-serif));
  --notlm-font-size: var(--notlm-font-size-override, 0.875rem);
  --notlm-fab-offset-bottom: 1rem;
  --notlm-fab-offset-right: 1rem;
  --notlm-z-chat: 11000;
  --notlm-z-palette: 11050;
  font-family: var(--notlm-font);
  font-size: var(--notlm-font-size);
  color: var(--notlm-text);
}
.notlm-palette-backdrop { position: fixed; inset: 0; z-index: var(--notlm-z-palette); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; padding-inline: 1rem; }
.notlm-palette-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.55); border: 0; cursor: pointer; }
.notlm-palette-panel { position: relative; width: min(100%, 32rem); border-radius: var(--notlm-radius-sm); border: 1px solid var(--notlm-border); background: var(--notlm-surface); box-shadow: 0 20px 40px rgba(0,0,0,0.35); overflow: hidden; }
.notlm-palette-input { width: 100%; border: 0; outline: none; padding: 0.75rem 1rem; font-size: 0.875rem; background: transparent; color: var(--notlm-text); border-bottom: 1px solid var(--notlm-border-muted); }
.notlm-palette-input::placeholder { color: var(--notlm-text-muted); }
.notlm-palette-list { max-height: 20rem; overflow-y: auto; margin: 0; padding: 0.25rem 0; list-style: none; }
.notlm-palette-item { width: 100%; text-align: left; padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 0; background: transparent; cursor: pointer; color: var(--notlm-text); }
.notlm-palette-item:hover, .notlm-palette-item-active { background: var(--notlm-surface-hover); }
.notlm-palette-item:disabled { opacity: 0.65; cursor: not-allowed; }
.notlm-palette-item-meta { font-size: 0.75rem; color: var(--notlm-text-muted); margin-top: 0.125rem; }
.notlm-fab-root { position: fixed; bottom: var(--notlm-fab-offset-bottom); right: var(--notlm-fab-offset-right); z-index: var(--notlm-z-chat); display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
.notlm-chat-panel { width: min(calc(100vw - 2rem), 24rem); height: min(90vh, 34rem); display: flex; flex-direction: column; border-radius: var(--notlm-radius); border: 1px solid var(--notlm-border); background: var(--notlm-surface); box-shadow: 0 20px 40px rgba(0,0,0,0.35); overflow: hidden; }
.notlm-chat-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--notlm-border-muted); background: var(--notlm-surface-muted); font-weight: 600; color: var(--notlm-text); }
.notlm-chat-close { border: 0; background: transparent; cursor: pointer; color: var(--notlm-text-muted); font-size: 1.25rem; line-height: 1; padding: 0.25rem 0.5rem; }
.notlm-chat-messages { flex: 1; overflow-y: auto; padding: 0.5rem 0.75rem; min-height: 0; background: var(--notlm-surface); }
.notlm-chat-bubble { border-radius: var(--notlm-radius-sm); padding: 0.375rem 0.625rem; max-width: 95%; white-space: pre-wrap; font-size: 0.8125rem; margin-bottom: 0.5rem; }
.notlm-chat-bubble-user { margin-left: auto; background: var(--notlm-accent); color: var(--notlm-on-accent); }
.notlm-chat-bubble-assistant { margin-right: auto; background: var(--notlm-surface-hover); color: var(--notlm-text); border: 1px solid var(--notlm-border-muted); }
.notlm-chat-turn { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 0.5rem; width: 100%; }
.notlm-chat-turn .notlm-chat-bubble { margin-bottom: 0.25rem; }
.notlm-chat-turn .notlm-chat-bubble-user { align-self: flex-end; }
.notlm-chat-choices { display: flex; flex-wrap: wrap; gap: 0.25rem; margin: 0 0 0.25rem; max-width: 95%; }
.notlm-chat-choice { border-radius: var(--notlm-radius-sm); border: 1px solid var(--notlm-accent); background: var(--notlm-surface-muted); color: var(--notlm-accent); padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer; }
.notlm-chat-choice:hover { background: var(--notlm-accent); color: var(--notlm-on-accent); }
.notlm-chat-input-row { display: flex; gap: 0.25rem; align-items: flex-end; padding: 0.5rem; border-top: 1px solid var(--notlm-border-muted); background: var(--notlm-surface-muted); }
.notlm-chat-input { flex: 1; resize: none; border-radius: var(--notlm-radius-sm); border: 1px solid var(--notlm-border); padding: 0.375rem 0.5rem; font-size: 0.8125rem; background: var(--notlm-surface); color: var(--notlm-text); }
.notlm-chat-input::placeholder { color: var(--notlm-text-muted); }
.notlm-chat-btn { border-radius: var(--notlm-radius-sm); border: 1px solid var(--notlm-border); padding: 0.375rem 0.625rem; cursor: pointer; background: var(--notlm-surface); color: var(--notlm-text); }
.notlm-chat-btn-mic { display: inline-flex; align-items: center; justify-content: center; padding: 0.375rem 0.5rem; min-width: 2.25rem; }
.notlm-mic-icon { display: block; flex-shrink: 0; }
.notlm-chat-btn-primary { background: var(--notlm-accent); color: var(--notlm-on-accent); border-color: var(--notlm-accent); font-weight: 600; }
.notlm-chat-btn-listening { background: var(--notlm-danger-bg); color: var(--notlm-danger-text); }
.notlm-fab-btn { border-radius: 9999px; border: 0; width: 3.25rem; height: 3.25rem; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.25); background: var(--notlm-accent); color: var(--notlm-on-accent); font-size: 1.25rem; padding: 0; }
.notlm-fab-btn-secondary { background: var(--notlm-surface-muted); color: var(--notlm-text); border: 1px solid var(--notlm-border); }
.notlm-fab-btn[data-assistant-open="true"],
.notlm-fab-btn[data-checklist-open="true"] { filter: brightness(1.08); background: var(--notlm-accent); color: var(--notlm-on-accent); border-color: transparent; }
.notlm-fab-icon { width: 1.5rem; height: 1.5rem; display: block; }
.notlm-checklist-root { position: fixed; inset: 0; z-index: 11040; display: flex; align-items: flex-end; justify-content: flex-end; padding: 0 1rem 5.5rem; pointer-events: none; }
.notlm-checklist-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); border: 0; cursor: pointer; pointer-events: auto; }
.notlm-checklist-panel { position: relative; pointer-events: auto; width: min(100%, 28rem); max-height: min(60vh, 32rem); display: flex; flex-direction: column; border-radius: var(--notlm-radius); border: 1px solid var(--notlm-border, var(--color-border, #d1d5db)); background: var(--notlm-surface, var(--color-surface, #ffffff)); box-shadow: 0 20px 40px rgba(0,0,0,0.35); overflow: hidden; color: var(--notlm-text, var(--color-text, #111827)); }
.notlm-checklist-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--notlm-border-muted, var(--color-border-muted, #e5e7eb)); background: var(--notlm-surface-muted, var(--color-surface-muted, var(--color-surface-light, #f9fafb))); color: var(--notlm-text, var(--color-text, #111827)); }
.notlm-checklist-close { border: 0; background: transparent; cursor: pointer; color: var(--notlm-text-muted, var(--color-text-muted, #6b7280)); font-size: 1.25rem; line-height: 1; padding: 0.25rem 0.5rem; }
.notlm-checklist-list { flex: 1; overflow-y: auto; margin: 0; padding: 0.25rem 0; list-style: none; min-height: 0; background: var(--notlm-surface, var(--color-surface, #ffffff)); }
.notlm-checklist-item { border-bottom: 1px solid var(--notlm-border-muted, var(--color-border-muted, #e5e7eb)); }
.notlm-checklist-item:last-child { border-bottom: 0; }
.notlm-checklist-row { width: 100%; text-align: left; padding: 0.625rem 0.75rem; border: 0; background: transparent; cursor: pointer; color: var(--notlm-text, var(--color-text, #111827)); display: flex; flex-direction: column; gap: 0.25rem; }
.notlm-checklist-row:hover:not(:disabled) { background: var(--notlm-surface-hover, var(--color-surface-hover, var(--color-surface-light, #f3f4f6))); }
.notlm-checklist-row:disabled { opacity: 0.7; cursor: default; }
.notlm-checklist-title { font-size: 0.875rem; font-weight: 600; }
.notlm-checklist-phase { font-size: 0.6875rem; color: var(--notlm-text-muted, var(--color-text-muted, #6b7280)); }
.notlm-checklist-state { font-size: 0.75rem; color: var(--notlm-accent, var(--color-primary, #2563eb)); }
.notlm-spotlight-root { position: fixed; inset: 0; z-index: 80; }
.notlm-spotlight-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.5); border: 0; cursor: default; }
.notlm-spotlight-ring { pointer-events: none; position: absolute; border-radius: var(--notlm-radius-sm); box-shadow: 0 0 0 4px var(--notlm-accent), 0 0 0 9999px rgba(0,0,0,0.45); }
.notlm-spotlight-card { position: absolute; z-index: 81; max-width: 20rem; border-radius: var(--notlm-radius-sm); border: 1px solid var(--notlm-border); background: var(--notlm-surface); padding: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.25); font-size: 0.875rem; color: var(--notlm-text); }
.${DEFAULT_FLASH_CLASS} { animation: notlm-field-flash 0.7s ease-in-out 3; outline: 2px solid var(--notlm-accent); outline-offset: 2px; }
@keyframes notlm-field-flash { 0%, 100% { outline-color: var(--notlm-accent); } 50% { outline-color: var(--notlm-accent-soft); } }
`;

export { DEFAULT_FLASH_CLASS };

/** Optional chrome theme overrides. Unset fields keep host-inherited CSS defaults. */
export type NotLMAppearance = {
  accent?: string;
  accentSoft?: string;
  onAccent?: string;
  surface?: string;
  surfaceMuted?: string;
  surfaceHover?: string;
  border?: string;
  borderMuted?: string;
  text?: string;
  textMuted?: string;
  dangerBg?: string;
  dangerText?: string;
  radius?: string;
  radiusSm?: string;
  font?: string;
  fontSize?: string;
  fabOffsetBottom?: string;
  fabOffsetRight?: string;
};

export type NotLMChromeSlot =
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
  appearance?: NotLMAppearance
): Record<string, string> {
  if (!appearance) return {};
  const map: Record<string, string | undefined> = {
    '--notlm-accent': appearance.accent,
    '--notlm-accent-soft': appearance.accentSoft,
    '--notlm-on-accent': appearance.onAccent,
    '--notlm-surface': appearance.surface,
    '--notlm-surface-muted': appearance.surfaceMuted,
    '--notlm-surface-hover': appearance.surfaceHover,
    '--notlm-border': appearance.border,
    '--notlm-border-muted': appearance.borderMuted,
    '--notlm-text': appearance.text,
    '--notlm-text-muted': appearance.textMuted,
    '--notlm-danger-bg': appearance.dangerBg,
    '--notlm-danger-text': appearance.dangerText,
    '--notlm-radius': appearance.radius,
    '--notlm-radius-sm': appearance.radiusSm,
    '--notlm-font': appearance.font,
    '--notlm-font-size': appearance.fontSize,
    '--notlm-fab-offset-bottom': appearance.fabOffsetBottom,
    '--notlm-fab-offset-right': appearance.fabOffsetRight,
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined && v !== '') out[k] = v;
  }
  return out;
}
