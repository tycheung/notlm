import type { AssistantFeatures, PackRuntime, RuntimeContextBase } from '@notlm/core';
import { CommandPalette } from './CommandPalette.js';
import { NotLMFab } from './NotLMFab.js';
import { SpotlightOverlay } from './SpotlightOverlay.js';
import { ChecklistPanel } from './ChecklistPanel.js';
import {
  NotLMProvider,
  useNotLM,
  type NotLMProviderProps,
} from './NotLMContext.js';

function NotLMChrome() {
  const { features, spotlight, clearSpotlight } = useNotLM();
  const showFabDock = features.chat !== false || features.checklist !== false;

  return (
    <>
      {features.palette !== false && <CommandPalette />}
      {/* Single dock: checklist above assistant; checklist alone when chat is off. */}
      {showFabDock && <NotLMFab />}
      <ChecklistPanel />
      {features.spotlight !== false && (
        <SpotlightOverlay spotlight={spotlight} onDismiss={clearSpotlight} />
      )}
    </>
  );
}

export function NotLMHost({
  pack,
  getContext,
  navigate,
  openModal,
  openSurface,
  onWizardPage,
  enrichStatuses,
  draftCompilers,
  onApplyDraft,
  features,
  parseUtteranceFn,
  clearPendingChoices,
  tryHandleUtterance,
  onCoachEvent,
  missLog,
  conversationLog,
  fallbackLlm,
  secondaryFallbackLlm,
  resolveQuery,
  previewMutation,
  executeMutation,
  runTour,
  openSearchHit,
  resolveContextAsk,
  appearance,
  className,
  classNames,
  components,
  style,
  children,
}: NotLMProviderProps) {
  return (
    <NotLMProvider
      pack={pack}
      getContext={getContext}
      navigate={navigate}
      openModal={openModal}
      openSurface={openSurface}
      onWizardPage={onWizardPage}
      enrichStatuses={enrichStatuses}
      draftCompilers={draftCompilers}
      onApplyDraft={onApplyDraft}
      features={features}
      parseUtteranceFn={parseUtteranceFn}
      clearPendingChoices={clearPendingChoices}
      tryHandleUtterance={tryHandleUtterance}
      onCoachEvent={onCoachEvent}
      missLog={missLog}
      conversationLog={conversationLog}
      fallbackLlm={fallbackLlm}
      secondaryFallbackLlm={secondaryFallbackLlm}
      resolveQuery={resolveQuery}
      previewMutation={previewMutation}
      executeMutation={executeMutation}
      runTour={runTour}
      openSearchHit={openSearchHit}
      resolveContextAsk={resolveContextAsk}
      appearance={appearance}
      className={className}
      classNames={classNames}
      components={components}
      style={style}
    >
      {children}
      <NotLMChrome />
    </NotLMProvider>
  );
}

export type { PackRuntime, RuntimeContextBase, AssistantFeatures };
