import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type { ChatMessage } from '@notlm/core';
import type { NotLMAppearance, NotLMChromeSlot } from './notlm.css.js';

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

export type NotLMChromeComponents = {
  FabButton?: ComponentType<FabButtonSlotProps>;
  ChatHeader?: ComponentType<ChatHeaderSlotProps>;
  ChatPanel?: ComponentType<ChatPanelSlotProps>;
};

export type NotLMChromeClassNames = Partial<Record<NotLMChromeSlot, string>>;

export type NotLMChromeLabels = {
  assistantTitle?: string;
  paletteAriaLabel?: string;
  palettePlaceholder?: string;
  paletteSearchAriaLabel?: string;
  /** Shown while decision fallback (Laya) is in flight. */
  thinking?: string;
  composerPlaceholder?: string;
  sendLabel?: string;
  cancelLabel?: string;
  checklistTitle?: string;
  regenerateLabel?: string;
  copyLabel?: string;
};

export type NotLMChromeConfig = {
  appearance?: NotLMAppearance;
  /** Extra class on each `.notlm-host-root` surface. */
  className?: string;
  classNames?: NotLMChromeClassNames;
  components?: NotLMChromeComponents;
  /** Copy overrides for built-in chrome (palette / chat titles). */
  labels?: NotLMChromeLabels;
  /** Inline style merged after appearance CSS vars (advanced). */
  style?: CSSProperties;
};

export type { ChatMessage };
