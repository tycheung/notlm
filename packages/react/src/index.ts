export {
  flashGuideField,
  flashGuideFieldsSequential,
  sortGuideIdsByDocumentOrder,
  DEFAULT_FLASH_CLASS,
  DEFAULT_GUIDE_ATTR,
} from './fieldFlash.js';
export type { FlashFieldOpts, SequentialFlashOpts } from './fieldFlash.js';
export { applyPrefill } from './fieldPrefill.js';
export type { ApplyPrefillOpts } from './fieldPrefill.js';
export {
  clickGuide,
  clickGuideByPath,
  createGuideNavigate,
} from './clickGuide.js';
export type { ClickGuideOpts } from './clickGuide.js';
export {
  draftStorageKey,
  readDraft,
  writeDraft,
  clearDraft,
} from './draftBridge.js';
export { useDraftBridge } from './useDraftBridge.js';
export {
  resolveBeforeOpenIds,
  runBeforeOpen,
  isSpotlightOnly,
  coachCopyForRole,
} from './guideInteract.js';
export { getSpeechRecognitionCtor, isWebSpeechSupported } from './speech.js';
export { useWebSpeechInput } from './useWebSpeechInput.js';
export { useSpotlightController, type SpotlightState } from './useSpotlightController.js';
export {
  UIPILOT_CSS,
  appearanceToCssVars,
  type UiPilotAppearance,
  type UiPilotChromeSlot,
} from './uipilot.css.js';
export type {
  ChatHeaderSlotProps,
  ChatPanelSlotProps,
  FabButtonSlotProps,
  UiPilotChromeClassNames,
  UiPilotChromeComponents,
  UiPilotChromeConfig,
} from './chromeTypes.js';
export {
  UiPilotProvider,
  UiPilotContext,
  useUiPilot,
  type UiPilotContextValue,
  type UiPilotProviderProps,
  type ExecuteStepOpts,
  type OpenModalFn,
} from './UiPilotContext.js';
export { useGuideModal } from './useGuideModal.js';
export { CommandPalette } from './CommandPalette.js';
export { UiPilotFab } from './UiPilotFab.js';
export { SpotlightOverlay } from './SpotlightOverlay.js';
export { UiPilotHost } from './UiPilotHost.js';
