import type { AssistantFeatures, PackRuntime, RuntimeContextBase } from '@uipilot/core';
import { CommandPalette } from './CommandPalette.js';
import { UiPilotFab } from './UiPilotFab.js';
import { SpotlightOverlay } from './SpotlightOverlay.js';
import {
  UiPilotProvider,
  useUiPilot,
  type UiPilotProviderProps,
} from './UiPilotContext.js';

function UiPilotChrome() {
  const { features, spotlight, clearSpotlight } = useUiPilot();

  return (
    <>
      {features.palette !== false && <CommandPalette />}
      {features.chat !== false && <UiPilotFab />}
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
  features,
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
      features={features}
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
