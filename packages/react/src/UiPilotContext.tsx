import {
  advanceAfterStepCompleted,
  dispatchUserUtterance,
  emptySession,
  evaluateFlowStatuses,
  formatBlockedQueueMessage,
  listMissingRequires,
  markActiveStep,
  type AssistantFeatures,
  type ChatChoice,
  type ChatMessage,
  type LoadedPack,
  type PackRuntime,
  type ParseUtteranceFn,
  type RuntimeContextBase,
  type SessionSlots,
  type SlotBag,
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
import { DEFAULT_GUIDE_ATTR, flashGuideField, flashGuideFieldsSequential } from './fieldFlash.js';
import { applyPrefill } from './fieldPrefill.js';
import { appearanceToCssVars } from './uipilot.css.js';
import { useSpotlightController, type SpotlightState } from './useSpotlightController.js';

type NavigateFn = (path: string, opts?: { search?: string }) => void;

export type ExecuteStepOpts = {
  prefill?: SlotBag;
  skipCoach?: boolean;
};

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
  executeStep: (stepId: StepId, opts?: ExecuteStepOpts) => void;
  notifyStepCompleted: (stepId: StepId) => void;
  setPanelOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  clearSpotlight: () => void;
  chrome: UiPilotChromeConfig;
  hostRootStyle: CSSProperties;
  hostRootClassName: string;
};

const UiPilotContext = createContext<UiPilotContextValue | null>(null);

function newMessage(
  role: ChatMessage['role'],
  text: string,
  choices?: ChatChoice[]
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    at: Date.now(),
    ...(choices?.length ? { choices } : {}),
  };
}

export type UiPilotProviderProps = {
  pack: PackRuntime;
  getContext: () => RuntimeContextBase;
  navigate: NavigateFn;
  features?: AssistantFeatures;
  /** Optional hybrid / ONNX ranker parser (feature-flagged by host). */
  parseUtteranceFn?: ParseUtteranceFn;
  children: ReactNode;
} & UiPilotChromeConfig;

export function UiPilotProvider({
  pack,
  getContext,
  navigate,
  features: featuresProp,
  parseUtteranceFn,
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

  const pushAssistant = useCallback((text: string, opts?: { choices?: ChatChoice[] }) => {
    setMessages((prev) => [...prev, newMessage('assistant', text, opts?.choices)]);
  }, []);

  const executeStep = useCallback(
    (stepId: StepId, opts?: ExecuteStepOpts) => {
      const loaded = asLoadedPack(pack);
      const liveCtx = getContext();
      const missing = listMissingRequires(loaded, stepId, liveCtx, sessionRef.current.stale);
      if (missing.length > 0) {
        pushAssistant(formatBlockedQueueMessage(loaded, stepId, missing));
        return;
      }
      const nav = loaded.resolveNav(stepId, liveCtx);
      if (!nav) {
        pushAssistant('I could not find where to go for that step.');
        return;
      }
      setSession((prev) => {
        const next = markActiveStep(prev, stepId);
        sessionRef.current = next;
        return next;
      });

      if (nav.path) navigate(nav.path, nav.search ? { search: nav.search } : undefined);
      if (!opts?.skipCoach && nav.coachMessage) pushAssistant(nav.coachMessage);
      if (nav.spotlight && features.spotlight !== false) {
        showSpotlight(nav.spotlight, nav.coachMessage ?? `Focus: ${stepId}`);
      }
      if (nav.spotlight) {
        flashGuideField(nav.spotlight);
      }
      const mergedPrefill = { ...(nav.prefill ?? {}), ...(opts?.prefill ?? {}) };
      if (Object.keys(mergedPrefill).length > 0) {
        queueMicrotask(() => applyPrefill(mergedPrefill));
      }
      const userFill = nav.userFill?.filter(Boolean) ?? [];
      if (userFill.length > 0) {
        pushAssistant(
          userFill.length === 1
            ? 'Please fill in the highlighted field — I can’t type that for you.'
            : `Please fill in these ${userFill.length} fields — I’ll highlight each one from top to bottom.`
        );
        queueMicrotask(() => {
          flashGuideFieldsSequential(userFill, { onlyEmpty: false });
        });
      }
    },
    [features.spotlight, getContext, navigate, pack, pushAssistant, showSpotlight]
  );

  const executeStepRef = useRef(executeStep);
  executeStepRef.current = executeStep;

  const notifyStepCompleted = useCallback(
    (stepId: StepId) => {
      const loaded = asLoadedPack(pack);
      const result = advanceAfterStepCompleted(
        loaded,
        sessionRef.current,
        getContext(),
        stepId
      );
      sessionRef.current = result.session;
      setSession(result.session);
      for (const msg of result.messages) pushAssistant(msg);
      if (result.executeNext) {
        const next = result.executeNext;
        queueMicrotask(() => {
          executeStepRef.current(next.stepId, { prefill: next.slots });
        });
      }
    },
    [getContext, pack, pushAssistant]
  );

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
        setSession: (updater) => {
          setSession((prev) => {
            const next = updater(prev);
            sessionRef.current = next;
            return next;
          });
        },
        flashField: (guideId) => {
          flashGuideField(guideId);
        },
        parseUtteranceFn,
      });
    },
    [getContext, pack, parseUtteranceFn, pushAssistant]
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
