export type {
  ChatMessage,
  CompleteChatRequest,
  LlmEnv,
  LlmProvider,
  LlmProviderKind,
} from './types.js';

export {
  isRefusedSecretPath,
  loadLlmEnv,
  REFUSED_SECRET_PATHS,
} from './env.js';

export { createOllamaProvider } from './providers/ollama.js';
export { createOpenAiCompatProvider } from './providers/openaiCompat.js';
export { createProvider, createProviderFromEnv } from './providers/createProvider.js';

export { buildIntentTunePrompt, buildPackAuthorPrompt } from './prompts.js';
export {
  extractJsonText,
  parseModelJson,
} from './parseModelJson.js';
export type {
  ParseModelJsonFail,
  ParseModelJsonOk,
  ParseModelJsonResult,
} from './parseModelJson.js';

export { authorPackDraft } from './packAuthor.js';
export type { AuthorPackDraftResult, PackDraftPieces } from './packAuthor.js';

export { tuneIntents } from './intentsTune.js';
export type { TuneIntentsResult } from './intentsTune.js';

export { checkIntents } from './intentsCheck.js';
export type {
  CheckIntentsInput,
  IntentCheckCase,
  IntentCheckResult,
} from './intentsCheck.js';

export {
  DEFAULT_PLATEAU_CONFIG,
  type BatchNoveltySummary,
  type NoveltyReport,
  type ParseSignatureBucket,
  type PlateauConfig,
  type ScenarioCandidate,
  type StopReason,
} from './saturation/types.js';
export {
  jaccard,
  lexicalNovelty,
  normalizeForNovelty,
} from './saturation/lexicalNovelty.js';
export {
  countSignatures,
  parseSignature,
  parseSignatureFromResult,
  parseSignatureNovelty,
} from './saturation/parseSignatureNovelty.js';
export {
  buildNoveltyReport,
  combineNovelty,
  detectPlateau,
  estimateIncrementalNovelty,
  scoreBatchAgainstPrior,
  updatePlateauState,
  type PlateauState,
  type ScoredCandidate,
} from './saturation/novelty.js';
export {
  buildScenarioGeneratePrompt,
  buildSoftLabelPrompt,
  type ScenarioGenerateMode,
} from './saturation/generatePrompt.js';
export {
  generateScenarioCandidates,
  type GenerateCandidatesResult,
} from './saturation/generateCandidates.js';
export {
  softLabelCandidates,
  faqDraftFromSoftLabels,
  type SoftLabelResult,
  type SoftLabeledScenario,
} from './saturation/softLabel.js';
export {
  mineIntentFailures,
  type FailureMineResult,
} from './saturation/failureMining.js';
export {
  llmBatchGenerator,
  runHardAugment,
  runSaturationLoop,
  type BatchGenerator,
  type SaturateLoopResult,
} from './saturation/saturateLoop.js';

export { draftConversationalCopy } from './draftTalk.js';
export type { DraftTalkResult } from './draftTalk.js';

