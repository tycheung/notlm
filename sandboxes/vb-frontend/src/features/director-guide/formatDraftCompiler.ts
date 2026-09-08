/**
 * Pure compiler: natural language or graph-incremental utterances → v2 structure draft.
 * Optional fields (execution_order, carry_over, …) are only set when prompted or required.
 */
import type { EventStructurePayload } from '../../constants/defaultEventStructurePayload';
import { CANONICAL_PAYLOAD_VERSION } from '../../constants/defaultEventStructurePayload';
import { GUIDE_IDS } from './guideIds';
import {
  ADD_EDGE_RE,
  ADD_FINAL_RE,
  ADD_ROUND_RE,
  ADVANCEMENT_LEXICON,
  extractGameCount,
  extractMatchSavedQuery,
  extractPlacementCount,
  extractTopN,
  extractTopPercent,
  FINISH_FORMAT_RE,
  matchCompetitionMethod,
  matchRoundNameHint,
  type CompetitionMethodHint,
} from './formatLexicon';
import type { GuideSlotBag } from './types';

export type FormatMissingFill = {
  fieldGuideId: string;
  label: string;
  reason: string;
};

export type FormatCompileResult = {
  /** Next payload after applying this utterance (or current if no-op). */
  payload: EventStructurePayload;
  /** Free-text query to match a saved library format (if any). */
  matchQuery: string | null;
  /** User asked to finish/save/apply. */
  finishRequested: boolean;
  /** Short assistant summary. */
  summary: string | null;
  /** Honest notes for things we cannot encode yet. */
  notes: string[];
  missingRequired: FormatMissingFill[];
  /** Whether execution_order coaching is relevant after this compile. */
  needsExecutionOrder: boolean;
};

function emptyPayload(): EventStructurePayload {
  return {
    version: CANONICAL_PAYLOAD_VERSION,
    rounds: [],
    final_nodes: [],
    relationships: [],
  };
}

function clonePayload(p: EventStructurePayload | null | undefined): EventStructurePayload {
  if (!p) return emptyPayload();
  return JSON.parse(JSON.stringify(p)) as EventStructurePayload;
}

function slugRef(base: string, existing: Set<string>): string {
  let ref = base.replace(/[^a-z0-9_]+/gi, '_').toLowerCase() || 'round';
  if (!existing.has(ref)) return ref;
  let i = 2;
  while (existing.has(`${ref}_${i}`)) i += 1;
  return `${ref}_${i}`;
}

function roundRefs(payload: EventStructurePayload): Set<string> {
  return new Set(
    (payload.rounds || []).map((r) => String((r as { ref?: string }).ref || ''))
  );
}

function finalRefs(payload: EventStructurePayload): Set<string> {
  return new Set(
    (payload.final_nodes || []).map((f) => String((f as { ref?: string }).ref || ''))
  );
}

function countExitsFromSource(payload: EventStructurePayload, sourceRef: string): number {
  return (payload.relationships || []).filter(
    (rel) => String((rel as { source_ref?: string }).source_ref || '') === sourceRef
  ).length;
}

function sourcesWithMultipleExits(payload: EventStructurePayload): string[] {
  const counts = new Map<string, number>();
  for (const rel of payload.relationships || []) {
    const s = String((rel as { source_ref?: string }).source_ref || '');
    if (!s) continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s);
}

function makeRound(
  ref: string,
  roundNumber: number,
  games: number,
  method: CompetitionMethodHint,
  friendlyName: string
): Record<string, unknown> {
  const scoreType =
    method === 'eliminator' ? undefined : method === 'stepladder' || method === 'bracket'
      ? 'match_play'
      : method === 'round_robin' || method === 'pods'
        ? 'match_play'
        : undefined;
  return {
    ref,
    round_number: roundNumber,
    friendly_name: friendlyName,
    game_count: games,
    number_of_squads: 1,
    status: 'scheduled',
    competition_method: method,
    competition_method_config: { game_count: games },
    ...(scoreType ? { score_type: scoreType } : {}),
    allows_reentry: false,
    squads: [{ max_participants: 24 }],
  };
}

function makeFinal(ref: string, name: string, placement: number): Record<string, unknown> {
  return {
    ref,
    name,
    display_order: 0,
    include_in_standings: true,
    is_active: true,
    placement_count: placement,
  };
}

function makeEdge(opts: {
  source: string;
  targetRound?: string;
  targetFinal?: string;
  count?: number | null;
  percent?: number | null;
  winners?: boolean;
  executionOrder?: number;
}): Record<string, unknown> {
  const edge: Record<string, unknown> = {
    source_ref: opts.source,
    advancement_filter: opts.winners ? 'winners' : 'top_n',
    advancement_type: 'total_pinfall',
    tiebreaker_rule: 'highest_game',
    is_active: true,
    duplicate_advancement_policy: 'single_and_promote',
  };
  if (opts.targetFinal) edge.target_final_ref = opts.targetFinal;
  else if (opts.targetRound) edge.target_ref = opts.targetRound;
  if (opts.count != null && opts.count > 0) edge.advancement_count = opts.count;
  else if (opts.percent != null && opts.percent > 0) edge.advancement_percentage = opts.percent;
  // Only set execution_order when explicitly provided (multi-exit).
  if (opts.executionOrder != null) edge.execution_order = opts.executionOrder;
  return edge;
}

export function listFormatMissingRequired(
  payload: EventStructurePayload | null | undefined
): FormatMissingFill[] {
  const p = payload || emptyPayload();
  const missing: FormatMissingFill[] = [];
  const rounds = p.rounds || [];
  if (rounds.length < 1) {
    missing.push({
      fieldGuideId: GUIDE_IDS.FORMAT_ADD_STAGE,
      label: 'At least one round',
      reason: 'Add a qualifying (or first) stage with a game count.',
    });
    return missing;
  }
  for (const raw of rounds) {
    const r = raw as Record<string, unknown>;
    const ref = String(r.ref || '');
    if (!ref) {
      missing.push({
        fieldGuideId: GUIDE_IDS.FORMAT_ADD_STAGE,
        label: 'Round ref',
        reason: 'Each stage needs a stable id.',
      });
    }
    const games = Number(r.game_count);
    if (!Number.isFinite(games) || games < 1) {
      missing.push({
        fieldGuideId: GUIDE_IDS.FORMAT_ROUND_GAMES,
        label: `Games for ${r.friendly_name || ref || 'round'}`,
        reason: 'Every stage needs how many games are bowled.',
      });
    }
    const method = String(r.competition_method || 'eliminator');
    if (method !== 'eliminator' && r.score_type !== 'match_play') {
      missing.push({
        fieldGuideId: GUIDE_IDS.FORMAT_ROUND_SCORE_TYPE,
        label: `Score type for ${r.friendly_name || ref}`,
        reason: 'Match-play methods need score type match_play.',
      });
    }
  }
  for (const raw of p.relationships || []) {
    const rel = raw as Record<string, unknown>;
    if (!rel.source_ref) {
      missing.push({
        fieldGuideId: GUIDE_IDS.FORMAT_REL_SOURCE,
        label: 'Relationship source',
        reason: 'Each advancement arrow needs a source round.',
      });
    }
    if (!rel.target_ref && !rel.target_final_ref) {
      missing.push({
        fieldGuideId: GUIDE_IDS.FORMAT_REL_TARGET,
        label: 'Relationship target',
        reason: 'Each advancement arrow needs a destination round or payout node.',
      });
    }
    const filter = String(rel.advancement_filter || 'top_n');
    if (filter === 'top_n') {
      const count = Number(rel.advancement_count || 0);
      const pct = Number(rel.advancement_percentage || 0);
      if (count <= 0 && pct <= 0) {
        missing.push({
          fieldGuideId: GUIDE_IDS.FORMAT_REL_COUNT,
          label: 'Advancement size',
          reason: 'Say how many advance (top N) or what percent (top half).',
        });
      }
    }
  }
  for (const source of sourcesWithMultipleExits(p)) {
    const rels = (p.relationships || []).filter(
      (rel) => String((rel as { source_ref?: string }).source_ref || '') === source
    );
    const orders = new Set(
      rels.map((rel) => Number((rel as { execution_order?: number }).execution_order ?? 0))
    );
    if (orders.size < 2 && rels.length > 1) {
      missing.push({
        fieldGuideId: GUIDE_IDS.FORMAT_REL_EXEC_ORDER,
        label: `Execution order from ${source}`,
        reason:
          'This stage has more than one exit — set which cut runs first (lower order first).',
      });
    }
  }
  return missing;
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function applyNlDigest(text: string, base: EventStructurePayload): FormatCompileResult {
  const payload = clonePayload(base);
  const notes: string[] = [];
  const existing = roundRefs(payload);
  const finals = finalRefs(payload);

  // Qualifying-ish first round
  const games = extractGameCount(text) ?? 3;
  const methodHint = matchCompetitionMethod(text) || 'eliminator';
  const roundHint = matchRoundNameHint(text) || 'qualifying';
  let qualRef = [...existing].find((r) => r.includes('qualif')) || '';
  if (!qualRef && (/\bqualif|\bprelim|\bsweeper|\bgames?\b/i.test(text) || payload.rounds.length === 0)) {
    qualRef = slugRef(roundHint === 'final' ? 'qualifying' : roundHint, existing);
    existing.add(qualRef);
    const method =
      /\bqualif|\bprelim/i.test(text) && methodHint === 'bracket'
        ? 'eliminator'
        : methodHint === 'stepladder' && /\bqualif/i.test(text)
          ? 'eliminator'
          : /\bqualif|\bprelim/i.test(text)
            ? 'eliminator'
            : methodHint;
    payload.rounds.push(
      makeRound(qualRef, payload.rounds.length + 1, games, method as CompetitionMethodHint, titleCase(qualRef))
    );
  } else if (qualRef) {
    const r = payload.rounds.find((x) => String((x as { ref?: string }).ref) === qualRef) as
      | Record<string, unknown>
      | undefined;
    if (r && extractGameCount(text) != null) {
      r.game_count = games;
      const cfg = (r.competition_method_config as Record<string, unknown>) || {};
      r.competition_method_config = { ...cfg, game_count: games };
    }
  }

  // Second stage (bracket / final / stepladder)
  const wantsBracket = /\bbracket|single\s*elim|double\s*elim/i.test(text);
  const wantsStepladder = /\bstepladder|step\s*ladder|\bladder\b/i.test(text);
  const wantsFinal = /\bfinal|\bfinals\b/i.test(text) && !wantsBracket;
  let nextRef = '';
  let nextMethod: CompetitionMethodHint = 'eliminator';
  if (wantsBracket) {
    nextRef = slugRef('bracket', existing);
    nextMethod = 'bracket';
  } else if (wantsStepladder) {
    nextRef = slugRef('stepladder', existing);
    nextMethod = 'stepladder';
  } else if (wantsFinal || /\btop\s+\d+|top\s+half|advance/i.test(text)) {
    nextRef = slugRef('final', existing);
    nextMethod = 'eliminator';
  }
  if (nextRef && !existing.has(nextRef)) {
    existing.add(nextRef);
    const nextGames = wantsBracket || wantsStepladder ? extractGameCount(text) || 1 : games;
    payload.rounds.push(
      makeRound(nextRef, payload.rounds.length + 1, nextGames, nextMethod, titleCase(nextRef))
    );
  }

  // Championship / payout node
  const placement = extractPlacementCount(text);
  let champRef = [...finals].find((f) => /champ|payout|exit/i.test(f)) || '';
  if (placement != null || /\bchampionship|pay\s+top|payout/i.test(text)) {
    if (!champRef) {
      champRef = slugRef('championship', finals);
      finals.add(champRef);
      payload.final_nodes = payload.final_nodes || [];
      payload.final_nodes.push(
        makeFinal(champRef, 'Championship', placement != null ? placement : 3)
      );
    } else if (placement != null) {
      const fn = (payload.final_nodes || []).find(
        (f) => String((f as { ref?: string }).ref) === champRef
      ) as Record<string, unknown> | undefined;
      if (fn) fn.placement_count = placement;
    }
  }

  // Edges
  const topN = extractTopN(text);
  const topPct = extractTopPercent(text);
  const winners = ADVANCEMENT_LEXICON.winners.some((re) => re.test(text));
  const source = qualRef || String((payload.rounds[0] as { ref?: string })?.ref || '');
  const mid = nextRef;
  if (source && mid) {
    const already = (payload.relationships || []).some(
      (rel) =>
        String((rel as { source_ref?: string }).source_ref) === source &&
        String((rel as { target_ref?: string }).target_ref) === mid
    );
    if (!already) {
      payload.relationships.push(
        makeEdge({
          source,
          targetRound: mid,
          count: topN,
          percent: topN == null ? topPct : null,
          winners,
        })
      );
    }
  }
  if (champRef) {
    const from = mid || source;
    if (from) {
      const already = (payload.relationships || []).some(
        (rel) =>
          String((rel as { source_ref?: string }).source_ref) === from &&
          String((rel as { target_final_ref?: string }).target_final_ref) === champRef
      );
      if (!already) {
        payload.relationships.push(
          makeEdge({
            source: from,
            targetFinal: champRef,
            count: placement ?? topN ?? 3,
          })
        );
      }
    }
  }

  // Cashers + advance: second edge from same source → set execution_order
  if (/\bcashers?\b/i.test(text) && source) {
    const cashRef = slugRef('cashers', finals);
    if (!finals.has(cashRef)) {
      finals.add(cashRef);
      payload.final_nodes = payload.final_nodes || [];
      payload.final_nodes.push(makeFinal(cashRef, 'Cashers', topN ?? 16));
    }
    const alreadyCash = (payload.relationships || []).some(
      (rel) =>
        String((rel as { source_ref?: string }).source_ref) === source &&
        String((rel as { target_final_ref?: string }).target_final_ref) === cashRef
    );
    if (!alreadyCash) {
      payload.relationships.push(
        makeEdge({
          source,
          targetFinal: cashRef,
          count: topN ?? 16,
          executionOrder: 1,
        })
      );
    }
    // Ensure other exits from source get higher order
    for (const rel of payload.relationships) {
      const r = rel as Record<string, unknown>;
      if (r.source_ref === source && r.target_final_ref !== cashRef) {
        if (r.execution_order == null) r.execution_order = 2;
      }
    }
  }

  const needsExecutionOrder = sourcesWithMultipleExits(payload).length > 0;
  const missingRequired = listFormatMissingRequired(payload);
  return {
    payload,
    matchQuery: null,
    finishRequested: false,
    summary: `Built a draft with ${payload.rounds.length} stage(s) and ${
      (payload.relationships || []).length
    } advancement link(s).`,
    notes,
    missingRequired,
    needsExecutionOrder,
  };
}

function applyGraphOp(text: string, base: EventStructurePayload): FormatCompileResult | null {
  const payload = clonePayload(base);
  const existing = roundRefs(payload);
  const finals = finalRefs(payload);
  const notes: string[] = [];

  if (ADD_ROUND_RE.test(text)) {
    const hint = matchRoundNameHint(text) || 'round';
    const ref = slugRef(hint, existing);
    const games = extractGameCount(text);
    const method = matchCompetitionMethod(text) || 'eliminator';
    payload.rounds.push(
      makeRound(
        ref,
        payload.rounds.length + 1,
        games ?? 0, // 0 triggers missing-required flash when games omitted
        method,
        titleCase(hint)
      )
    );
    return {
      payload,
      matchQuery: null,
      finishRequested: false,
      summary: `Added stage “${titleCase(hint)}”${games ? ` (${games} games)` : ''}.`,
      notes,
      missingRequired: listFormatMissingRequired(payload),
      needsExecutionOrder: sourcesWithMultipleExits(payload).length > 0,
    };
  }

  if (ADD_FINAL_RE.test(text) || /\badd\s+championship\b/i.test(text)) {
    const placement = extractPlacementCount(text);
    const ref = slugRef(matchRoundNameHint(text) === 'cashers' ? 'cashers' : 'championship', finals);
    payload.final_nodes = payload.final_nodes || [];
    payload.final_nodes.push(
      makeFinal(ref, titleCase(ref), placement != null ? placement : 0)
    );
    return {
      payload,
      matchQuery: null,
      finishRequested: false,
      summary: `Added exit node “${titleCase(ref)}”.`,
      notes,
      missingRequired: listFormatMissingRequired(payload),
      needsExecutionOrder: sourcesWithMultipleExits(payload).length > 0,
    };
  }

  if (ADD_EDGE_RE.test(text) || /\bfrom\s+\w+\s+to\s+\w+/i.test(text)) {
    const fromHint = text.match(/\bfrom\s+([a-z0-9_\s-]+?)(?:\s+to\b|,|$)/i)?.[1]?.trim();
    const toHint = text.match(/\bto\s+([a-z0-9_\s-]+?)(?:\s|,|$)/i)?.[1]?.trim();
    const resolveRound = (hint: string | undefined) => {
      if (!hint) return '';
      const h = hint.toLowerCase();
      for (const r of payload.rounds) {
        const ref = String((r as { ref?: string }).ref || '');
        const name = String((r as { friendly_name?: string }).friendly_name || '').toLowerCase();
        if (ref.includes(h.replace(/\s+/g, '_')) || name.includes(h)) return ref;
      }
      return '';
    };
    const resolveFinal = (hint: string | undefined) => {
      if (!hint) return '';
      const h = hint.toLowerCase();
      for (const f of payload.final_nodes || []) {
        const ref = String((f as { ref?: string }).ref || '');
        const name = String((f as { name?: string }).name || '').toLowerCase();
        if (ref.includes(h.replace(/\s+/g, '_')) || name.includes(h)) return ref;
      }
      return '';
    };
    const source = resolveRound(fromHint) || String((payload.rounds[0] as { ref?: string })?.ref || '');
    const targetRound = resolveRound(toHint);
    const targetFinal = resolveFinal(toHint);
    if (!source || (!targetRound && !targetFinal)) {
      notes.push('Could not resolve both ends of that advancement link — name the source and destination stages.');
      return {
        payload,
        matchQuery: null,
        finishRequested: false,
        summary: null,
        notes,
        missingRequired: listFormatMissingRequired(payload),
        needsExecutionOrder: false,
      };
    }
    const topN = extractTopN(text);
    const topPct = extractTopPercent(text);
    const winners = ADVANCEMENT_LEXICON.winners.some((re) => re.test(text));
    const exitCount = countExitsFromSource(payload, source);
    const edge = makeEdge({
      source,
      targetRound: targetRound || undefined,
      targetFinal: targetFinal || undefined,
      count: topN,
      percent: topN == null ? topPct : null,
      winners,
      executionOrder: exitCount >= 1 ? exitCount + 1 : undefined,
    });
    // If this creates multi-exit and prior edges lack order, assign 1 to the first.
    if (exitCount >= 1) {
      for (const rel of payload.relationships) {
        const r = rel as Record<string, unknown>;
        if (r.source_ref === source && r.execution_order == null) {
          r.execution_order = 1;
        }
      }
    }
    payload.relationships.push(edge);
    return {
      payload,
      matchQuery: null,
      finishRequested: false,
      summary: `Added advancement from ${source} → ${targetRound || targetFinal}.`,
      notes,
      missingRequired: listFormatMissingRequired(payload),
      needsExecutionOrder: sourcesWithMultipleExits(payload).length > 0,
    };
  }

  return null;
}

/**
 * Compile an utterance against an optional existing draft payload.
 */
export function compileFormatUtterance(
  text: string,
  current: EventStructurePayload | null | undefined
): FormatCompileResult {
  const trimmed = text.trim();
  if (!trimmed) {
    const payload = clonePayload(current);
    return {
      payload,
      matchQuery: null,
      finishRequested: false,
      summary: null,
      notes: [],
      missingRequired: listFormatMissingRequired(payload),
      needsExecutionOrder: sourcesWithMultipleExits(payload).length > 0,
    };
  }

  const matchQuery = extractMatchSavedQuery(trimmed);
  if (matchQuery) {
    return {
      payload: clonePayload(current),
      matchQuery,
      finishRequested: false,
      summary: `Looking for a saved format matching “${matchQuery}”.`,
      notes: [],
      missingRequired: [],
      needsExecutionOrder: false,
    };
  }

  if (FINISH_FORMAT_RE.test(trimmed)) {
    const payload = clonePayload(current);
    return {
      payload,
      matchQuery: null,
      finishRequested: true,
      summary: 'Ready to save this format and apply it to the event.',
      notes: [],
      missingRequired: listFormatMissingRequired(payload),
      needsExecutionOrder: sourcesWithMultipleExits(payload).length > 0,
    };
  }

  const graph = applyGraphOp(trimmed, clonePayload(current));
  if (graph) return graph;

  // Full NL digest (also works as first utterance with empty draft)
  return applyNlDigest(trimmed, clonePayload(current));
}

export function summarizeFormatDraft(payload: EventStructurePayload): string {
  const rounds = (payload.rounds || [])
    .map((r) => String((r as { friendly_name?: string }).friendly_name || (r as { ref?: string }).ref || ''))
    .filter(Boolean);
  const finals = (payload.final_nodes || [])
    .map((f) => String((f as { name?: string }).name || (f as { ref?: string }).ref || ''))
    .filter(Boolean);
  const parts = [...rounds, ...finals];
  return parts.length ? parts.join(' → ') : 'Empty format draft';
}

/** Pack/dispatch slot bag from a format segment (pure; no API). */
export function slotsFromFormatCompile(
  segment: string,
  currentPayload: EventStructurePayload | null
): GuideSlotBag {
  const compiled = compileFormatUtterance(segment, currentPayload);
  const slots: GuideSlotBag = {
    formatDraft: compiled.payload,
    formatSummary: summarizeFormatDraft(compiled.payload),
  };
  if (compiled.matchQuery) slots.formatMatchQuery = compiled.matchQuery;
  if (compiled.finishRequested) slots.formatFinishRequested = true;
  if (compiled.notes.length) slots.notes = compiled.notes.join('; ');
  if (compiled.summary) slots.formatCompileSummary = compiled.summary;
  return slots;
}
