import {
  clearStale,
  completeQueueHead,
  dispatchUserUtterance,
  emptySession,
  evaluateFlowStatuses,
  type AssistantFeatures,
  type ChatMessage,
  type LoadedPack,
  type PackRuntime,
  type RuntimeContextBase,
  type SessionSlots,
  type StepId,
  type StepStatus,
} from '@uipilot/core';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { UiPilotChromeConfig } from './chromeTypes.js';
import { DEFAULT_GUIDE_ATTR, flashGuideField } from './fieldFlash.js';
import { appearanceToCssVars } from './uipilot.css.js';
import { useSpotlightController, type SpotlightState } from './useSpotlightController.js';

type NavigateFn = (path: string, opts?: { search?: string }) => void;

function asLoadedPack(pack: PackRuntime): LoadedPack {
  const withIntents = pack as PackRuntime & {
    aliases?: Record<string, string[]>;
    meta?: string[];
  };
  return {
    ...pack,
    aliases: withIntents.aliases ?? {},
    meta: withIntents.meta,
  };
}

export type UiPilotContextValue = {
  pack: PackRuntime;
  getContext: () => RuntimeContextBase;
  navigate: NavigateFn;
  features: AssistantFeatures;
  session: SessionSlots;
  messages: ChatMessage[];
  statuses: StepStatus[];
  panelOpen: boolean;
  paletteOpen: boolean;
  spotlight: SpotlightState;
  handleUserUtterance: (text: string) => void;
  executeStep: (stepId: StepId) => void;
  notifyStepCompleted: (stepId: StepId) => void;
  setPanelOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  clearSpotlight: () => void;
  chrome: UiPilotChromeConfig;
  hostRootStyle: CSSProperties;
  hostRootClassName: string;
};

const UiPilotContext = createContext<UiPilotContextValue | null>(null);

function newMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    at: Date.now(),
  };
}

export type UiPilotProviderProps = {
  pack: PackRuntime;
  getContext: () => RuntimeContextBase;
  navigate: NavigateFn;
  features?: AssistantFeatures;
  children: ReactNode;
} & UiPilotChromeConfig;

export function UiPilotProvider({
  pack,
  getContext,
  navigate,
  features: featuresProp,
  appearance,
  className,
  classNames,
  components,
  style,
  children,
}: UiPilotProviderProps) {
  const features = useMemo<AssistantFeatures>(
    () => ({
      chat: true,
      palette: true,
      spotlight: true,
      voice: true,
      ...featuresProp,
    }),
    [featuresProp]
  );

  const chrome = useMemo<UiPilotChromeConfig>(
    () => ({ appearance, className, classNames, components, style }),
    [appearance, className, classNames, components, style]
  );

  const hostRootStyle = useMemo<CSSProperties>(
    () => ({ ...appearanceToCssVars(appearance), ...style }),
    [appearance, style]
  );

  const hostRootClassName = ['uipilot-host-root', className, classNames?.root]
    .filter(Boolean)
    .join(' ');

  const [session, setSession] = useState<SessionSlots>(() => emptySession());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    newMessage('assistant', 'How can I help? Ask for a workflow step or open the command palette.'),
  ]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { spotlight, showSpotlight, clearSpotlight } = useSpotlightController(DEFAULT_GUIDE_ATTR);

  const ctx = getContext();
  const statuses = useMemo(
    () => evaluateFlowStatuses(pack, ctx, session.stale),
    [pack, ctx, session.stale]
  );

  const pushAssistant = useCallback((text: string) => {
    setMessages((prev) => [...prev, newMessage('assistant', text)]);
  }, []);

  const executeStep = useCallback(
    (stepId: StepId) => {
      const loaded = asLoadedPack(pack);
      const status = evaluateFlowStatuses(
        loaded,
        getContext(),
        sessionRef.current.stale
      ).find((s) => s.id === stepId);
      if (status && !status.available) {
        pushAssistant(status.blockedReason ?? 'That step is not available yet.');
        return;
      }
      const nav = loaded.resolveNav(stepId, getContext());
      if (!nav) {
        pushAssistant('I could not find where to go for that step.');
        return;
      }
      if (nav.path) navigate(nav.path, nav.search ? { search: nav.search } : undefined);
      if (nav.coachMessage) pushAssistant(nav.coachMessage);
      if (nav.spotlight && features.spotlight !== false) {
        showSpotlight(nav.spotlight, nav.coachMessage ?? `Focus: ${stepId}`);
      }
      if (nav.spotlight) {
        flashGuideField(nav.spotlight);
      }
    },
    [features.spotlight, getContext, navigate, pack, pushAssistant, showSpotlight]
  );

  const executeStepRef = useRef(executeStep);
  executeStepRef.current = executeStep;

  const notifyStepCompleted = useCallback((stepId: StepId) => {
    setSession((prev) => completeQueueHead(clearStale(prev, stepId)));
  }, []);

  const handleUserUtterance = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setMessages((prev) => [...prev, newMessage('user', trimmed)]);
      setPanelOpen(true);
      dispatchUserUtterance({
        text: trimmed,
        pack: asLoadedPack(pack),
        session: sessionRef.current,
        ctx: getContext(),
        pushAssistant,
        executeStep: executeStepRef.current,
        setSession,
      });
    },
    [getContext, pack, pushAssistant]
  );

  const value = useMemo<UiPilotContextValue>(
    () => ({
      pack,
      getContext,
      navigate,
      features,
      session,
      messages,
      statuses,
      panelOpen,
      paletteOpen,
      spotlight,
      handleUserUtterance,
      executeStep,
      notifyStepCompleted,
      setPanelOpen,
      setPaletteOpen,
      clearSpotlight,
      chrome,
      hostRootStyle,
      hostRootClassName,
    }),
    [
      chrome,
      clearSpotlight,
      executeStep,
      features,
      getContext,
      handleUserUtterance,
      hostRootClassName,
      hostRootStyle,
      messages,
      navigate,
      notifyStepCompleted,
      pack,
      paletteOpen,
      panelOpen,
      session,
      spotlight,
      statuses,
    ]
  );

  return (
    <UiPilotContext.Provider value={value}>{children}</UiPilotContext.Provider>
  );
}

export function useUiPilot(): UiPilotContextValue {
  const ctx = useContext(UiPilotContext);
  if (!ctx) {
    throw new Error('useUiPilot must be used within UiPilotProvider');
  }
  return ctx;
}

export { UiPilotContext };
