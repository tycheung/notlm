import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type { ChatMessage } from '@uipilot/core';
import type { UiPilotAppearance, UiPilotChromeSlot } from './uipilot.css.js';

export type FabButtonSlotProps = {
  open: boolean;
  onToggle: () => void;
  className?: string;
};

export type ChatHeaderSlotProps = {
  title: string;
  onClose: () => void;
  className?: string;
};

export type ChatPanelSlotProps = {
  header: ReactNode;
  messages: ReactNode;
  inputRow: ReactNode;
  voiceHint?: ReactNode;
  className?: string;
};

export type UiPilotChromeComponents = {
  FabButton?: ComponentType<FabButtonSlotProps>;
  ChatHeader?: ComponentType<ChatHeaderSlotProps>;
  ChatPanel?: ComponentType<ChatPanelSlotProps>;
};

export type UiPilotChromeClassNames = Partial<Record<UiPilotChromeSlot, string>>;

export type UiPilotChromeConfig = {
  appearance?: UiPilotAppearance;
  /** Extra class on each `.uipilot-host-root` surface. */
  className?: string;
  classNames?: UiPilotChromeClassNames;
  components?: UiPilotChromeComponents;
  /** Inline style merged after appearance CSS vars (advanced). */
  style?: CSSProperties;
};

export type { ChatMessage };
