/**
 * DOM / HTML control inventory for pack authoring.
 *
 * - `crawlHtml` — parse HTML without Playwright (unit-test friendly)
 * - `crawlWithPlaywright` — optional; requires `playwright` peer install
 */

export type {
  ControlInventory,
  CrawlHtmlOptions,
  InventoriedControl,
} from './types.js';

export { proposeGuideId } from './proposeGuideId.js';
export { mergeInventory } from './mergeInventory.js';
export { crawlHtml } from './crawlHtml.js';
export { crawlWithPlaywright } from './crawlWithPlaywright.js';
export {
  scanGuideIdsInDir,
  guideIdHitsToInventory,
  mergeGuideIdScan,
  type GuideIdHit,
  type ScanGuideIdsResult,
} from './scanGuideIds.js';

export { scanRoutes, type RouteHit, type ScanRoutesResult } from './scanRoutes.js';
export { scanForms, type FormHit, type ScanFormsResult } from './scanForms.js';
export {
  runStructuredExtract,
  assertRequiresPolicy,
  type StructuredExtract,
  type StructuredStep,
  type RunStructuredExtractOptions,
} from './structuredExtract.js';
export {
  traceToFlowDraft,
  appendTraceEvent,
  writeTraceFile,
  seedIntentsFromSteps,
  seedCorpusFromAliases,
  type TraceEvent,
  type ClickTrace,
  type FlowStepDraft,
  type TraceFlowDraft,
  type SeededIntents,
  type CorpusSeedCase,
} from './recordTrace.js';

export const MAPPER_STATUS = 'ready' as const;
