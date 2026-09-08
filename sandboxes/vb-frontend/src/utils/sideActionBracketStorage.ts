import type { Bracket } from './bracketEngine/types';

export interface StoredBracketEngine {
  run_id?: number;
  version?: number;
  generated_at?: string;
  generated_by?: number;
  max_brackets?: number;
  bracket_count?: number;
  unplaced_tickets?: number;
  brackets?: Bracket[];
  quotas?: Array<{ user_id: number; count: number; quota: number; unused: number }>;
  financials?: Record<string, unknown>;
  user_display_names?: Record<number, string>;
}

export function getUserDisplayNames(
  typeConfig: Record<string, unknown> | null | undefined
): Record<number, string> {
  const engine = getStoredBracketEngine(typeConfig);
  const raw = engine?.user_display_names;
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

export function getStoredBracketEngine(
  typeConfig: Record<string, unknown> | null | undefined
): StoredBracketEngine | null {
  const engine = typeConfig?.bracket_engine;
  if (!engine || typeof engine !== 'object') return null;
  return engine as StoredBracketEngine;
}

export function getStoredBrackets(
  typeConfig: Record<string, unknown> | null | undefined
): Bracket[] {
  const engine = getStoredBracketEngine(typeConfig);
  return Array.isArray(engine?.brackets) ? (engine.brackets as Bracket[]) : [];
}
