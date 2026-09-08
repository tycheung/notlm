# ADR-007 — Host chrome personalization (chat / palette / FAB)

## Status

Accepted

## Context

Consumers install `@uipilot/react`, run build-time CLI (`map` / `tune` / `prepare`), and mount
the Host. Feature flags already toggle surfaces on/off (G8), but the default FAB + chat
panel ship with a fixed `UIPILOT_CSS` string (hardcoded blues/grays). Product teams need
to **match brand** without forking `@uipilot/react` or reimplementing dispatch.

Personalization must not leak into NLU, pack JSON, or UI-actions invariants (ADR-003).
Runtime behavior stays identical; only presentation changes.

## Decision

Support **layered** customization for chat, FAB, palette, and spotlight chrome:

### Layer 1 — Stable class contract (always)

Keep documented `uipilot-*` class names (e.g. `uipilot-chat-panel`, `uipilot-fab-btn`).
Hosts may override via their own CSS without React API changes. Default `UIPILOT_CSS`
remains opt-in inject (`style.textContent = UIPILOT_CSS` or import helper).

### Layer 2 — CSS variables / `appearance` tokens

Default stylesheet uses CSS custom properties with fallbacks. Hosts set tokens via:

- `appearance` prop on `UiPilotProvider` / `UiPilotHost`, and/or  
- CSS on `.uipilot-host-root` (or a `className` / `style` root prop).

Token set (v1, illustrative — freeze in implementation slices):

| Token | Role |
|-------|------|
| `--uipilot-accent` | Primary buttons, user bubble, FAB, spotlight ring |
| `--uipilot-surface` | Panel / card background |
| `--uipilot-surface-muted` | Header / input chrome |
| `--uipilot-border` | Borders |
| `--uipilot-text` / `--uipilot-text-muted` | Copy |
| `--uipilot-radius` | Panel / bubble radius |
| `--uipilot-font` | Font stack |
| `--uipilot-fab-offset-*` | FAB position insets |
| `--uipilot-z-chat` / `--uipilot-z-palette` | Stacking (optional) |

### Layer 3 — Component / slot overrides (escape hatch)

Optional props so hosts can replace chrome pieces while keeping Provider dispatch:

```ts
components?: {
  FabButton?: ComponentType<FabButtonSlotProps>;
  ChatPanel?: ComponentType<ChatPanelSlotProps>;
  ChatHeader?: ComponentType<ChatHeaderSlotProps>;
  // palette / spotlight later as needed
};
classNames?: Partial<Record<UiPilotChromeSlot, string>>;
```

Slots receive **behavior props** (open, messages, onSubmit, listening, …) from context —
hosts style freely; they must not bypass `handleUserUtterance` / guide-id coaching.

### Non-goals (v1)

- Shipping multiple full visual themes as npm packages  
- CSS-in-JS mandatory runtime  
- Letting pack JSON dictate colors (appearance is **host app** concern, not pack learnings)  
- Changing coach copy / NLU via appearance props  

## Consequences

- PLAN gains **G10**; epic `chrome*` / slices in `SLICE_BACKLOG`.
- Demo host documents token override + one slot example.
- Facade export tests cover new public types/props.
- Playwright coach smoke still uses `data-testid` / roles — not brittle color asserts.
