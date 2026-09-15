import { DEFAULT_FLASH_CLASS } from './fieldFlash.js';

/**
 * Minimal host chrome styles. Inject once: `style.textContent = UIPILOT_CSS`.
 *
 * Defaults inherit from the host document’s CSS variables when present, so a
 * transplanted pack picks up the product theme without hard-coding colors.
 * Pass `appearance` (or set `--uipilot-*` on `.uipilot-host-root`) to override
 * fonts, colors, radii, and FAB offsets.
 *
 * Host token fallbacks (first match wins):
 * - accent: --color-primary | --primary
 * - surface: --color-surface | --surface
 * - text: --color-text | --text
 * - font: --font-ui | --font-family
 *
 * Stable class contract (hosts may override in their CSS):
 * - uipilot-host-root, uipilot-fab-root, uipilot-fab-btn, uipilot-fab-btn-secondary
 * - uipilot-checklist-fab (stacked above assistant in fab-root)
 * - uipilot-chat-panel, uipilot-chat-header, uipilot-chat-close
 * - uipilot-chat-messages, uipilot-chat-bubble, uipilot-chat-bubble-user|assistant
 * - uipilot-chat-turn, uipilot-chat-choices, uipilot-chat-choice
 * - uipilot-chat-input-row, uipilot-chat-input, uipilot-chat-btn, uipilot-chat-btn-primary|listening
 * - uipilot-checklist-root|backdrop|panel|header|close|list|item|row|title|phase|state
 * - uipilot-palette-backdrop|scrim|panel|input|list|item|item-active
 * - uipilot-spotlight-root|scrim|ring|card
 */
export const UIPILOT_CSS = `
.uipilot-host-root {
  --uipilot-accent: var(--color-primary, var(--primary, #2563eb));
  --uipilot-accent-soft: var(--color-primary-light, var(--primary-light, #93c5fd));
  --uipilot-surface: var(--color-surface, var(--surface, #ffffff));
  --uipilot-surface-muted: var(--color-surface-muted, var(--surface-muted, var(--color-surface-light, #f9fafb)));
  --uipilot-surface-hover: var(--color-surface-hover, var(--surface-hover, var(--color-surface-light, #f3f4f6)));
  --uipilot-border: var(--color-border, var(--border, #d1d5db));
  --uipilot-border-muted: var(--color-border-muted, var(--border-muted, #e5e7eb));
  --uipilot-text: var(--color-text, var(--text, #111827));
  --uipilot-text-muted: var(--color-text-muted, var(--text-muted, #6b7280));
  --uipilot-danger-bg: var(--color-danger-bg, #fef2f2);
  --uipilot-danger-text: var(--color-danger, var(--danger, #b91c1c));
  --uipilot-on-accent: var(--color-on-primary, #ffffff);
  --uipilot-radius: var(--radius-card, 0.75rem);
  --uipilot-radius-sm: var(--radius-input, 0.375rem);
  --uipilot-font: var(--font-ui, var(--font-family, system-ui, sans-serif));
  --uipilot-font-size: var(--uipilot-font-size-override, 0.875rem);
  --uipilot-fab-offset-bottom: 1rem;
  --uipilot-fab-offset-right: 1rem;
  --uipilot-z-chat: 11000;
  --uipilot-z-palette: 11050;
  font-family: var(--uipilot-font);
  font-size: var(--uipilot-font-size);
  color: var(--uipilot-text);
}
.uipilot-palette-backdrop { position: fixed; inset: 0; z-index: var(--uipilot-z-palette); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; padding-inline: 1rem; }
.uipilot-palette-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.55); border: 0; cursor: pointer; }
.uipilot-palette-panel { position: relative; width: min(100%, 32rem); border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-border); background: var(--uipilot-surface); box-shadow: 0 20px 40px rgba(0,0,0,0.35); overflow: hidden; }
.uipilot-palette-input { width: 100%; border: 0; outline: none; padding: 0.75rem 1rem; font-size: 0.875rem; background: transparent; color: var(--uipilot-text); border-bottom: 1px solid var(--uipilot-border-muted); }
.uipilot-palette-input::placeholder { color: var(--uipilot-text-muted); }
.uipilot-palette-list { max-height: 20rem; overflow-y: auto; margin: 0; padding: 0.25rem 0; list-style: none; }
.uipilot-palette-item { width: 100%; text-align: left; padding: 0.5rem 0.75rem; font-size: 0.875rem; border: 0; background: transparent; cursor: pointer; color: var(--uipilot-text); }
.uipilot-palette-item:hover, .uipilot-palette-item-active { background: var(--uipilot-surface-hover); }
.uipilot-palette-item:disabled { opacity: 0.65; cursor: not-allowed; }
.uipilot-palette-item-meta { font-size: 0.75rem; color: var(--uipilot-text-muted); margin-top: 0.125rem; }
.uipilot-fab-root { position: fixed; bottom: var(--uipilot-fab-offset-bottom); right: var(--uipilot-fab-offset-right); z-index: var(--uipilot-z-chat); display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
.uipilot-chat-panel { width: min(calc(100vw - 2rem), 24rem); height: min(90vh, 34rem); display: flex; flex-direction: column; border-radius: var(--uipilot-radius); border: 1px solid var(--uipilot-border); background: var(--uipilot-surface); box-shadow: 0 20px 40px rgba(0,0,0,0.35); overflow: hidden; }
.uipilot-chat-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--uipilot-border-muted); background: var(--uipilot-surface-muted); font-weight: 600; color: var(--uipilot-text); }
.uipilot-chat-close { border: 0; background: transparent; cursor: pointer; color: var(--uipilot-text-muted); font-size: 1.25rem; line-height: 1; padding: 0.25rem 0.5rem; }
.uipilot-chat-messages { flex: 1; overflow-y: auto; padding: 0.5rem 0.75rem; min-height: 0; background: var(--uipilot-surface); }
.uipilot-chat-bubble { border-radius: var(--uipilot-radius-sm); padding: 0.375rem 0.625rem; max-width: 95%; white-space: pre-wrap; font-size: 0.8125rem; margin-bottom: 0.5rem; }
.uipilot-chat-bubble-user { margin-left: auto; background: var(--uipilot-accent); color: var(--uipilot-on-accent); }
.uipilot-chat-bubble-assistant { margin-right: auto; background: var(--uipilot-surface-hover); color: var(--uipilot-text); border: 1px solid var(--uipilot-border-muted); }
.uipilot-chat-turn { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 0.5rem; width: 100%; }
.uipilot-chat-turn .uipilot-chat-bubble { margin-bottom: 0.25rem; }
.uipilot-chat-turn .uipilot-chat-bubble-user { align-self: flex-end; }
.uipilot-chat-choices { display: flex; flex-wrap: wrap; gap: 0.25rem; margin: 0 0 0.25rem; max-width: 95%; }
.uipilot-chat-choice { border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-accent); background: var(--uipilot-surface-muted); color: var(--uipilot-accent); padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer; }
.uipilot-chat-choice:hover { background: var(--uipilot-accent); color: var(--uipilot-on-accent); }
.uipilot-chat-input-row { display: flex; gap: 0.25rem; align-items: flex-end; padding: 0.5rem; border-top: 1px solid var(--uipilot-border-muted); background: var(--uipilot-surface-muted); }
.uipilot-chat-input { flex: 1; resize: none; border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-border); padding: 0.375rem 0.5rem; font-size: 0.8125rem; background: var(--uipilot-surface); color: var(--uipilot-text); }
.uipilot-chat-input::placeholder { color: var(--uipilot-text-muted); }
.uipilot-chat-btn { border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-border); padding: 0.375rem 0.625rem; cursor: pointer; background: var(--uipilot-surface); color: var(--uipilot-text); }
.uipilot-chat-btn-primary { background: var(--uipilot-accent); color: var(--uipilot-on-accent); border-color: var(--uipilot-accent); font-weight: 600; }
.uipilot-chat-btn-listening { background: var(--uipilot-danger-bg); color: var(--uipilot-danger-text); }
.uipilot-fab-btn { border-radius: 9999px; border: 0; width: 3.25rem; height: 3.25rem; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.25); background: var(--uipilot-accent); color: var(--uipilot-on-accent); font-size: 1.25rem; padding: 0; }
.uipilot-fab-btn-secondary { background: var(--uipilot-surface-muted); color: var(--uipilot-text); border: 1px solid var(--uipilot-border); }
.uipilot-fab-btn[data-assistant-open="true"],
.uipilot-fab-btn[data-checklist-open="true"] { filter: brightness(1.08); background: var(--uipilot-accent); color: var(--uipilot-on-accent); border-color: transparent; }
.uipilot-fab-icon { width: 1.5rem; height: 1.5rem; display: block; }
.uipilot-checklist-root { position: fixed; inset: 0; z-index: 11040; display: flex; align-items: flex-end; justify-content: flex-end; padding: 0 1rem 5.5rem; pointer-events: none; }
.uipilot-checklist-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); border: 0; cursor: pointer; pointer-events: auto; }
.uipilot-checklist-panel { position: relative; pointer-events: auto; width: min(100%, 28rem); max-height: min(60vh, 32rem); display: flex; flex-direction: column; border-radius: var(--uipilot-radius); border: 1px solid var(--uipilot-border); background: var(--uipilot-surface); box-shadow: 0 20px 40px rgba(0,0,0,0.35); overflow: hidden; }
.uipilot-checklist-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--uipilot-border-muted); background: var(--uipilot-surface-muted); color: var(--uipilot-text); }
.uipilot-checklist-close { border: 0; background: transparent; cursor: pointer; color: var(--uipilot-text-muted); font-size: 1.25rem; line-height: 1; padding: 0.25rem 0.5rem; }
.uipilot-checklist-list { flex: 1; overflow-y: auto; margin: 0; padding: 0.25rem 0; list-style: none; min-height: 0; }
.uipilot-checklist-item { border-bottom: 1px solid var(--uipilot-border-muted); }
.uipilot-checklist-item:last-child { border-bottom: 0; }
.uipilot-checklist-row { width: 100%; text-align: left; padding: 0.625rem 0.75rem; border: 0; background: transparent; cursor: pointer; color: var(--uipilot-text); display: flex; flex-direction: column; gap: 0.25rem; }
.uipilot-checklist-row:hover:not(:disabled) { background: var(--uipilot-surface-hover); }
.uipilot-checklist-row:disabled { opacity: 0.7; cursor: default; }
.uipilot-checklist-title { font-size: 0.875rem; font-weight: 600; }
.uipilot-checklist-phase { font-size: 0.6875rem; color: var(--uipilot-text-muted); }
.uipilot-checklist-state { font-size: 0.75rem; color: var(--uipilot-accent); }
.uipilot-spotlight-root { position: fixed; inset: 0; z-index: 80; }
.uipilot-spotlight-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.5); border: 0; cursor: default; }
.uipilot-spotlight-ring { pointer-events: none; position: absolute; border-radius: var(--uipilot-radius-sm); box-shadow: 0 0 0 4px var(--uipilot-accent), 0 0 0 9999px rgba(0,0,0,0.45); }
.uipilot-spotlight-card { position: absolute; z-index: 81; max-width: 20rem; border-radius: var(--uipilot-radius-sm); border: 1px solid var(--uipilot-border); background: var(--uipilot-surface); padding: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.25); font-size: 0.875rem; color: var(--uipilot-text); }
.${DEFAULT_FLASH_CLASS} { animation: uipilot-field-flash 0.7s ease-in-out 3; outline: 2px solid var(--uipilot-accent); outline-offset: 2px; }
@keyframes uipilot-field-flash { 0%, 100% { outline-color: var(--uipilot-accent); } 50% { outline-color: var(--uipilot-accent-soft); } }
`;

export { DEFAULT_FLASH_CLASS };

/** Optional chrome theme overrides. Unset fields keep host-inherited CSS defaults. */
export type UiPilotAppearance = {
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
    '--uipilot-on-accent': appearance.onAccent,
    '--uipilot-surface': appearance.surface,
    '--uipilot-surface-muted': appearance.surfaceMuted,
    '--uipilot-surface-hover': appearance.surfaceHover,
    '--uipilot-border': appearance.border,
    '--uipilot-border-muted': appearance.borderMuted,
    '--uipilot-text': appearance.text,
    '--uipilot-text-muted': appearance.textMuted,
    '--uipilot-danger-bg': appearance.dangerBg,
    '--uipilot-danger-text': appearance.dangerText,
    '--uipilot-radius': appearance.radius,
    '--uipilot-radius-sm': appearance.radiusSm,
    '--uipilot-font': appearance.font,
    '--uipilot-font-size': appearance.fontSize,
    '--uipilot-fab-offset-bottom': appearance.fabOffsetBottom,
    '--uipilot-fab-offset-right': appearance.fabOffsetRight,
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined && v !== '') out[k] = v;
  }
  return out;
}
