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

function ChecklistFab() {
  const { features, checklistOpen, setChecklistOpen, setPanelOpen, setPaletteOpen } =
    useUiPilot();
  if (features.checklist === false) return null;
  return (
    <button
      type="button"
      className="uipilot-checklist-fab"
      data-guide-id="guide-checklist-fab"
      data-testid="uipilot-checklist-fab"
      aria-label={checklistOpen ? 'Close checklist' : 'Open checklist'}
      onClick={() => {
        setPanelOpen(false);
        setPaletteOpen(false);
        setChecklistOpen(!checklistOpen);
      }}
    >
      List
    </button>
  );
}

function UiPilotChrome() {
  const { features, spotlight, clearSpotlight } = useUiPilot();

  return (
    <>
      {features.palette !== false && <CommandPalette />}
      {features.chat !== false && <UiPilotFab />}
      <ChecklistFab />
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
