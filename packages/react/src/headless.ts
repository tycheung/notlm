/**
 * Headless entry — provider + hooks, no FAB/palette/checklist chrome.
 */
export {
  NotLMProvider,
  NotLMContext,
  useNotLM,
  type NotLMContextValue,
  type NotLMProviderProps,
  type ExecuteStepOpts,
  type OpenModalFn,
  type OpenSurfaceFn,
  type OnWizardPageFn,
  type EnrichStatusesFn,
} from './NotLMContext.js';
export { useGuideModal } from './useGuideModal.js';
export { useGuideSurfaceBridge } from './useGuideSurface.js';
export { useDraftBridge } from './useDraftBridge.js';
export {
  draftStorageKey,
  readDraft,
  writeDraft,
  clearDraft,
} from './draftBridge.js';
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
  resolveBeforeOpenIds,
  runBeforeOpen,
  isSpotlightOnly,
  coachCopyForRole,
} from './guideInteract.js';
export { getSpeechRecognitionCtor, isWebSpeechSupported } from './speech.js';
export { useWebSpeechInput } from './useWebSpeechInput.js';
export { useSpotlightController, type SpotlightState } from './useSpotlightController.js';
export type {
  ChatHeaderSlotProps,
  ChatPanelSlotProps,
  FabButtonSlotProps,
  NotLMChromeClassNames,
  NotLMChromeComponents,
  NotLMChromeConfig,
  NotLMChromeLabels,
} from './chromeTypes.js';
