import type { AssistantFeatures, PackRuntime, RuntimeContextBase } from '@uipilot/core';
import { CommandPalette } from './CommandPalette.js';
import { UiPilotFab } from './UiPilotFab.js';
import { SpotlightOverlay } from './SpotlightOverlay.js';
import { ChecklistPanel } from './ChecklistPanel.js';
import {
  UiPilotProvider,
  useUiPilot,
  type UiPilotProviderProps,
} from './UiPilotContext.js';

function UiPilotChrome() {
  const { features, spotlight, clearSpotlight } = useUiPilot();
  const showFabDock = features.chat !== false || features.checklist !== false;

  return (
    <>
      {features.palette !== false && <CommandPalette />}
      {/* Single dock: checklist above assistant; checklist alone when chat is off. */}
      {showFabDock && <UiPilotFab />}
      <ChecklistPanel />
      {features.spotlight !== false && (
        <SpotlightOverlay spotlight={spotlight} onDismiss={clearSpotlight} />
      )}
    </>
  );
}

export function UiPilotHost({
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
  tryHandleUtterance,
  onCoachEvent,
  missLog,
  appearance,
  className,
  classNames,
  components,
  style,
  children,
}: UiPilotProviderProps) {
  return (
    <UiPilotProvider
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
      tryHandleUtterance={tryHandleUtterance}
      onCoachEvent={onCoachEvent}
      missLog={missLog}
      appearance={appearance}
      className={className}
      classNames={classNames}
      components={components}
      style={style}
    >
      {children}
      <UiPilotChrome />
    </UiPilotProvider>
  );
}

export type { PackRuntime, RuntimeContextBase, AssistantFeatures };
