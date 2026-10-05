/**
 * Platform-default heuristic config (generic English product assistant).
 * No host/product brand tokens in platform defaults.
 * Hosts overlay via pack `heuristics.json`.
 */
import type { HeuristicsConfig, MetaPatternDef } from './types.js';
import platformDefaults from './heuristicsDefaults.json' with { type: 'json' };

export const PLATFORM_HEURISTICS = platformDefaults.heuristics as HeuristicsConfig;

/** Built-in meta intents as JSON-shaped defs (overridable / extendable by pack). */
export const PLATFORM_META_PATTERNS = platformDefaults.metaPatterns as MetaPatternDef[];
