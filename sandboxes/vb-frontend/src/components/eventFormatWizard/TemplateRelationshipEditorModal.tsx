import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import {
  AdvancementFilter,
  AdvancementMethod,
  DuplicateAdvancementPolicy,
} from '../../types/roundRelationship';
import {
  ADVANCEMENT_SCORE_BASIS_OPTIONS,
  ADVANCEMENT_SCORE_SCOPE_OPTIONS,
  DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE,
  H2H_DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE,
  RELATIONSHIP_ADVANCEMENT_TYPES,
  RELATIONSHIP_TIEBREAKER_RULES,
  AdvancementType,
  advancementTypeSupportsScoreScope,
} from '../../types/round_enums';
import { getCompetitionMethodDisplayLabel } from '../../utils/competitionMethodDisplay';
import { relationshipCarryOverUiAllowed } from '../../utils/relationshipCarryOverUi';

const H2H_ELIMINATION_METHODS = new Set<AdvancementMethod>([
  AdvancementMethod.STEPLADDER,
  AdvancementMethod.BRACKET,
  AdvancementMethod.PODS,
]);

function defaultAdvancementTypeForSource(
  sourceMethod: AdvancementMethod,
  toFinal: boolean
): AdvancementType {
  if (toFinal && H2H_ELIMINATION_METHODS.has(sourceMethod)) {
    return H2H_DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE;
  }
  return DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE;
}

export type TemplateRelCreateMode = 'round_target' | 'final_node_target';

export interface TemplateRelationshipEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Record<string, unknown> | null;
  roundRefs: string[];
  roundLabels?: Record<string, string>;
  /** Round payload rows — used to inherit `competition_method` from source stage */
  roundSpecs?: Record<string, unknown>[];
  finalRefs: string[];
  finalLabels?: Record<string, string>;
  existingRelationships?: Record<string, unknown>[];
  isNew: boolean;
  createMode: TemplateRelCreateMode;
  onSave: (next: Record<string, unknown>) => void;
  onDelete?: () => void;
}

const FILTER_OPTS: { value: AdvancementFilter; label: string }[] = [
  { value: AdvancementFilter.WINNERS, label: 'Winners' },
  { value: AdvancementFilter.LOSERS, label: 'Losers' },
  { value: AdvancementFilter.ALL, label: 'All' },
  { value: AdvancementFilter.TOP_N, label: 'Top N (overall)' },
  { value: AdvancementFilter.TOP_N_PER_SQUAD, label: 'Top N per squad' },
  {
    value: AdvancementFilter.TOP_N_PER_SQUAD_AT_LARGE,
    label: 'Top N per squad + at-large',
  },
  { value: AdvancementFilter.BOTTOM_N, label: 'Bottom N' },
  { value: AdvancementFilter.RANGE, label: 'Range' },
];
const DUPLICATE_POLICY_LABELS: Record<DuplicateAdvancementPolicy, string> = {
  [DuplicateAdvancementPolicy.ALLOW_MULTIPLE]: 'Allow duplicates across destinations',
  [DuplicateAdvancementPolicy.SINGLE_AND_PROMOTE]: 'Single destination with backfill',
  [DuplicateAdvancementPolicy.SINGLE_NO_BACKFILL]: 'Single destination without backfill',
};

function sourceRoundSpec(
  local: Record<string, unknown>,
  roundSpecs: Record<string, unknown>[]
): Record<string, unknown> | null {
  const ref = local.source_ref != null ? String(local.source_ref) : '';
  if (!ref) return null;
  return roundSpecs.find((s) => String(s.ref) === ref) || null;
}

const TemplateRelationshipEditorModal: React.FC<TemplateRelationshipEditorModalProps> = ({
  isOpen,
  onClose,
  draft,
  roundRefs,
  roundLabels = {},
  roundSpecs = [],
  finalRefs,
  finalLabels = {},
  existingRelationships = [],
  isNew,
  createMode,
  onSave,
  onDelete,
}) => {
  const [local, setLocal] = useState<Record<string, unknown> | null>(null);
  const [targetRef, setTargetRef] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setLocal(null);
      setTargetRef('');
      setErrors({});
      return;
    }
    if (draft) {
      if (draft.target_final_ref) {
        setTargetRef(`final:${String(draft.target_final_ref)}`);
      } else if (draft.target_ref) {
        setTargetRef(`round:${String(draft.target_ref)}`);
      } else {
        setTargetRef('');
      }
      const copy = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>;
      delete copy.advancement_method;
      delete copy.method_config;
      setLocal(copy);
      setErrors({});
      return;
    }
    setTargetRef(
      createMode === 'final_node_target'
        ? `final:${finalRefs[0] || ''}`
        : `round:${roundRefs[1] || roundRefs[0] || ''}`
    );
    const sourceRef = roundRefs[0] || '';
    const sourceRow = (roundSpecs || []).find((r) => String(r.ref ?? '') === sourceRef);
    const sourceMethodRaw = String(
      sourceRow?.competition_method || AdvancementMethod.ELIMINATOR
    );
    const sourceMethod = (Object.values(AdvancementMethod) as string[]).includes(
      sourceMethodRaw
    )
      ? (sourceMethodRaw as AdvancementMethod)
      : AdvancementMethod.ELIMINATOR;
    const toFinal = createMode === 'final_node_target';
    const base: Record<string, unknown> = {
      source_ref: sourceRef,
      advancement_filter: toFinal ? AdvancementFilter.TOP_N : AdvancementFilter.WINNERS,
      advancement_count: toFinal ? 3 : undefined,
      advancement_percentage: undefined,
      min_advancement_count: undefined,
      advancement_type: defaultAdvancementTypeForSource(sourceMethod, toFinal),
      tiebreaker_rule: undefined,
      advancement_score_basis: undefined,
      advancement_score_scope: 'source_round',
      carry_over_enabled: false,
      delay_rounds: 0,
      description: '',
      is_active: true,
      execution_order: 0,
      duplicate_advancement_policy: DuplicateAdvancementPolicy.SINGLE_AND_PROMOTE,
    };
    if (toFinal) {
      base.target_final_ref = finalRefs[0] || '';
    } else {
      base.target_ref = roundRefs[1] || roundRefs[0] || '';
    }
    setLocal(base);
    setErrors({});
  }, [isOpen, draft, isNew, roundRefs, finalRefs, createMode, roundSpecs]);

  const sourceSpec = local ? sourceRoundSpec(local, roundSpecs) : null;
  const effectiveMethod = useMemo(() => {
    if (!local) return AdvancementMethod.ELIMINATOR;
    if (local.target_final_ref) return AdvancementMethod.ELIMINATOR;
    const raw = String(sourceSpec?.competition_method || AdvancementMethod.ELIMINATOR);
    return (Object.values(AdvancementMethod) as string[]).includes(raw)
      ? (raw as AdvancementMethod)
      : AdvancementMethod.ELIMINATOR;
  }, [local, sourceSpec]);

  const validateLocal = (next: Record<string, unknown>): boolean => {
    const nextErrors: Record<string, string> = {};
    const sourceRef = String(next.source_ref ?? '');
    const roundTargetRef = next.target_ref != null ? String(next.target_ref) : '';
    const finalTargetRef = next.target_final_ref != null ? String(next.target_final_ref) : '';

    if (!sourceRef) {
      nextErrors.source_ref = 'Source round is required.';
    }
    if (!roundTargetRef && !finalTargetRef) {
      nextErrors.target = 'Select a destination stage.';
    }
    if (roundTargetRef && roundTargetRef === sourceRef) {
      nextErrors.target = 'Source and destination cannot be the same round.';
    }

    const count = Number(next.advancement_count ?? 0);
    const percent = Number(next.advancement_percentage ?? 0);
    const atLarge = Number(next.at_large_advancement_count ?? 0);
    const hasCount = count > 0;
    const hasPercent = percent > 0;
    const filter = String(next.advancement_filter ?? '');
    const isPerSquad = filter === AdvancementFilter.TOP_N_PER_SQUAD;
    const isPerSquadAtLarge = filter === AdvancementFilter.TOP_N_PER_SQUAD_AT_LARGE;

    if (isPerSquad || isPerSquadAtLarge) {
      if (!hasCount) {
        nextErrors.advancement_count = 'Specify how many advance from each squad.';
      }
      if (hasPercent) {
        nextErrors.advancement_percentage =
          'Percentage advancement is not supported for per-squad cuts.';
      }
      if (isPerSquadAtLarge && atLarge <= 0) {
        nextErrors.at_large_advancement_count = 'Specify how many at-large spots to fill.';
      }
    } else if (toFinal || effectiveMethod === AdvancementMethod.ELIMINATOR) {
      if (!hasCount && !hasPercent) {
        nextErrors.advancement_count = 'Specify either advancement count or advancement percent.';
      }
      if (hasCount && hasPercent) {
        nextErrors.advancement_count = 'Choose either count or percent, not both.';
        nextErrors.advancement_percentage = 'Choose either count or percent, not both.';
      }
    } else if (!hasCount) {
      nextErrors.advancement_count = 'Specify how many advance (Top N) for this link.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!local) return;
    const next = { ...local };
    delete next.advancement_method;
    delete next.method_config;
    if (next.target_final_ref) {
      delete next.target_ref;
      if (!next.source_ref || !next.target_final_ref) return;
    } else {
      delete next.target_final_ref;
      if (!next.source_ref || !next.target_ref) return;
    }
    if (next.advancement_type == null || next.advancement_type === '') {
      const src = sourceRoundSpec(next, roundSpecs || []);
      const raw = String(src?.competition_method || AdvancementMethod.ELIMINATOR);
      const method = (Object.values(AdvancementMethod) as string[]).includes(raw)
        ? (raw as AdvancementMethod)
        : AdvancementMethod.ELIMINATOR;
      next.advancement_type = defaultAdvancementTypeForSource(
        method,
        Boolean(next.target_final_ref)
      );
    }
    const savingToFinal = Boolean(next.target_final_ref);
    const specAtSave = sourceRoundSpec(next, roundSpecs);
    const rawMethodAtSave = String(
      specAtSave?.competition_method || AdvancementMethod.ELIMINATOR
    );
    const methodAtSave = (Object.values(AdvancementMethod) as string[]).includes(
      rawMethodAtSave
    )
      ? (rawMethodAtSave as AdvancementMethod)
      : AdvancementMethod.ELIMINATOR;
    if (savingToFinal || !relationshipCarryOverUiAllowed(methodAtSave)) {
      next.carry_over_enabled = false;
    }
    if (!savingToFinal) {
      next.advancement_score_scope = undefined;
    } else if (
      next.advancement_score_scope == null ||
      next.advancement_score_scope === ''
    ) {
      next.advancement_score_scope = 'source_round';
    }
    if (
      savingToFinal &&
      !advancementTypeSupportsScoreScope(String(next.advancement_type ?? ''))
    ) {
      next.advancement_score_scope = undefined;
    }
    if (!validateLocal(next)) return;
    onSave(next);
    onClose();
  };

  const handleTargetChange = (value: string) => {
    setTargetRef(value);
    const [kind, raw] = value.split(':');
    const ref = String(raw || '');
    if (!ref) return;
    setLocal((prev) => {
      if (!prev) return prev;
      if (kind === 'final') {
        return {
          ...prev,
          target_final_ref: ref,
          target_ref: undefined,
          advancement_filter: AdvancementFilter.TOP_N,
          advancement_count:
            prev.advancement_count != null ? prev.advancement_count : 3,
        };
      }
      return {
        ...prev,
        target_ref: ref,
        target_final_ref: undefined,
      };
    });
    setErrors({});
  };

  const shouldShowExecutionOrder = useMemo(() => {
    if (!local) return false;
    const sourceRef = String(local.source_ref ?? '');
    if (!sourceRef) return false;
    const sameSourceCount = existingRelationships.filter(
      (rel) => String(rel.source_ref ?? '') === sourceRef
    ).length;
    const effectiveCount = isNew ? sameSourceCount + 1 : sameSourceCount;
    return effectiveCount > 1;
  }, [existingRelationships, isNew, local]);

  if (!local) return null;

  const toFinal = Boolean(local.target_final_ref);
  const advancementFilter = String(local.advancement_filter ?? AdvancementFilter.WINNERS);
  const isPerSquadCut = advancementFilter === AdvancementFilter.TOP_N_PER_SQUAD;
  const isPerSquadAtLargeCut =
    advancementFilter === AdvancementFilter.TOP_N_PER_SQUAD_AT_LARGE;
  const isAnyPerSquadCut = isPerSquadCut || isPerSquadAtLargeCut;
  const effectiveMethodLabel = getCompetitionMethodDisplayLabel(effectiveMethod, {
    roundRef: String(local.source_ref ?? ''),
    relationships: [
      ...existingRelationships.filter((relationship) => relationship !== draft),
      local,
    ],
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Add flow arrow (template)' : 'Edit flow arrow (template)'}
      size="large"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            {!isNew && onDelete && (
              <Button type="button" variant="danger" onClick={onDelete}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="lightbackground" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="darkbackground" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div>
          <Label>From (source round)</Label>
          <select
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            value={String(local.source_ref ?? '')}
            data-guide-id="guide-format-rel-source"
            onChange={(e) => {
              const nextSource = e.target.value;
              const src = (roundSpecs || []).find((r) => String(r.ref ?? '') === nextSource);
              const raw = String(src?.competition_method || AdvancementMethod.ELIMINATOR);
              const method = (Object.values(AdvancementMethod) as string[]).includes(raw)
                ? (raw as AdvancementMethod)
                : AdvancementMethod.ELIMINATOR;
              const toFinal = Boolean(local.target_final_ref);
              const patch: Record<string, unknown> = { ...local, source_ref: nextSource };
              // When pointing a new H2H stage at finals, prefer elimination order.
              if (
                toFinal &&
                H2H_ELIMINATION_METHODS.has(method) &&
                (local.advancement_type === DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE ||
                  local.advancement_type == null ||
                  local.advancement_type === '')
              ) {
                patch.advancement_type = H2H_DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE;
              }
              setLocal(patch);
            }}
          >
            {roundRefs.map((r) => (
              <option key={r} value={r}>
                {roundLabels[r] || r}
              </option>
            ))}
          </select>
          {errors.source_ref && <p className="text-red-600 text-sm mt-1">{errors.source_ref}</p>}
        </div>

        <div>
          <Label>To (destination stage)</Label>
          <select
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            value={targetRef}
            onChange={(e) => handleTargetChange(e.target.value)}
          >
            <option value="">Select target stage</option>
            {roundRefs.map((r) => (
              <option key={`round:${r}`} value={`round:${r}`}>
                {roundLabels[r] || r}
              </option>
            ))}
            {finalRefs.length > 0 && (
              <option value="" disabled>
                ------------------------------
              </option>
            )}
            {finalRefs.map((r) => (
              <option key={`final:${r}`} value={`final:${r}`}>
                {finalLabels[r] || r}
              </option>
            ))}
          </select>
          {errors.target && <p className="text-red-600 text-sm mt-1">{errors.target}</p>}
        </div>

        {!toFinal && sourceSpec && (
          <p className="text-xs text-text-muted rounded border border-border bg-muted/10 p-2">
            This arrow inherits competition format from the source round:
            {' '}<strong>{effectiveMethodLabel}</strong>. Ranking, tiebreaker,
            and score carry-over are configured on this arrow.
          </p>
        )}

        {(effectiveMethod === AdvancementMethod.ELIMINATOR || toFinal) && (
          <div>
            <Label>Advancement filter</Label>
            <select
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              value={String(local.advancement_filter ?? AdvancementFilter.WINNERS)}
              onChange={(e) => {
                const nextFilter = e.target.value as AdvancementFilter;
                const perSquad =
                  nextFilter === AdvancementFilter.TOP_N_PER_SQUAD ||
                  nextFilter === AdvancementFilter.TOP_N_PER_SQUAD_AT_LARGE;
                setLocal({
                  ...local,
                  advancement_filter: nextFilter,
                  advancement_percentage: perSquad ? undefined : local.advancement_percentage,
                  at_large_advancement_count:
                    nextFilter === AdvancementFilter.TOP_N_PER_SQUAD_AT_LARGE
                      ? local.at_large_advancement_count
                      : undefined,
                });
              }}
            >
              {FILTER_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {effectiveMethod !== AdvancementMethod.ELIMINATOR && !toFinal && (
          <>
            <Input
              label="Number to advance (Top N)"
              data-guide-id="guide-format-rel-count"
              type="number"
              min={1}
              value={local.advancement_count != null ? String(local.advancement_count) : ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                setLocal({
                  ...local,
                  advancement_count: v === '' ? undefined : Math.max(1, parseInt(v, 10) || 1),
                });
              }}
              fullWidth
            />
            <p className="text-xs text-text-muted -mt-2">
              Match-play formats advance by count only from this source round.
            </p>
          </>
        )}

        {(effectiveMethod === AdvancementMethod.ELIMINATOR || toFinal) && (
          <>
            <Input
              label={
                isPerSquadAtLargeCut
                  ? 'Advance per squad'
                  : isPerSquadCut
                    ? 'Advance per squad'
                    : 'Advancement count (fixed)'
              }
              type="number"
              min={isAnyPerSquadCut ? 1 : 0}
              value={local.advancement_count != null ? String(local.advancement_count) : ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                const nextCount = v === ''
                  ? undefined
                  : Math.max(isAnyPerSquadCut ? 1 : 0, parseInt(v, 10) || 0);
                setLocal({
                  ...local,
                  advancement_count: nextCount,
                  advancement_percentage:
                    nextCount != null && nextCount > 0 && !isAnyPerSquadCut
                      ? undefined
                      : local.advancement_percentage,
                });
              }}
              fullWidth
            />
            {errors.advancement_count && (
              <p className="text-red-600 text-sm -mt-2">{errors.advancement_count}</p>
            )}
            {isPerSquadAtLargeCut && (
              <>
                <Input
                  label="At-large advance"
                  type="number"
                  min={1}
                  value={
                    local.at_large_advancement_count != null
                      ? String(local.at_large_advancement_count)
                      : ''
                  }
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setLocal({
                      ...local,
                      at_large_advancement_count:
                        v === '' ? undefined : Math.max(1, parseInt(v, 10) || 1),
                    });
                  }}
                  fullWidth
                />
                {errors.at_large_advancement_count && (
                  <p className="text-red-600 text-sm -mt-2">
                    {errors.at_large_advancement_count}
                  </p>
                )}
                <p className="text-xs text-text-muted -mt-2">
                  Takes the top bowlers from each squad, then fills remaining slots from
                  the highest scores left in the field.
                </p>
              </>
            )}
            {isPerSquadCut && (
              <p className="text-xs text-text-muted -mt-2">
                Ranks bowlers within each qualifying squad and advances the top N from
                every squad.
              </p>
            )}
            {!isAnyPerSquadCut && (
              <>
            <Input
              label="Advancement percent"
              type="number"
              min={0}
              max={100}
              value={local.advancement_percentage != null ? String(local.advancement_percentage) : ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                const nextPct =
                  v === '' ? undefined : Math.min(100, Math.max(0, parseInt(v, 10) || 0));
                setLocal({
                  ...local,
                  advancement_percentage: nextPct,
                  advancement_count:
                    nextPct != null && nextPct > 0
                      ? undefined
                      : local.advancement_count,
                });
              }}
              fullWidth
            />
            {errors.advancement_percentage && (
              <p className="text-red-600 text-sm -mt-2">{errors.advancement_percentage}</p>
            )}
            <Input
              label="Minimum to advance"
              type="number"
              min={0}
              value={local.min_advancement_count != null ? String(local.min_advancement_count) : ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                setLocal({
                  ...local,
                  min_advancement_count: v === '' ? undefined : Math.max(0, parseInt(v, 10) || 0),
                });
              }}
              fullWidth
            />
              </>
            )}
          </>
        )}
        {(effectiveMethod === AdvancementMethod.ELIMINATOR || toFinal) && !isAnyPerSquadCut && (
          <p className="text-xs text-text-muted -mt-2">
            Use either count or percent. Minimum applies only when using percent.
          </p>
        )}

        <div>
          <Label>Criteria</Label>
          <p className="text-xs text-text-muted mb-1">
            For stepladder, bracket, and pods finishes, prefer{' '}
            <span className="font-medium text-text">Elimination Order</span> (when each
            entrant was eliminated — champion first).{' '}
            <span className="font-medium text-text">Match winners</span> ranks by
            standings/seed (or match progression), not by finish depth — usually wrong for
            payout places.
          </p>
          <select
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            value={String(
              local.advancement_type ?? DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE
            )}
            onChange={(e) => {
              const advancement_type = e.target.value;
              const patch: Record<string, unknown> = { advancement_type };
              if (
                toFinal &&
                !advancementTypeSupportsScoreScope(advancement_type)
              ) {
                patch.advancement_score_scope = undefined;
              } else if (toFinal && local.advancement_score_scope == null) {
                patch.advancement_score_scope = 'source_round';
              }
              setLocal({ ...local, ...patch });
            }}
          >
            {RELATIONSHIP_ADVANCEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {toFinal &&
        advancementTypeSupportsScoreScope(
          String(local.advancement_type ?? DEFAULT_RELATIONSHIP_ADVANCEMENT_TYPE)
        ) ? (
          <div>
            <Label>Ranking totals from</Label>
            <p className="mb-1 text-xs text-text-muted">
              For payout exits from pods, within-pod cuts still decide who cashes; this
              controls how those finalists are ordered (e.g. pod 2 only vs qualifying + all pods).
            </p>
            <select
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              value={String(local.advancement_score_scope ?? 'source_round')}
              onChange={(e) =>
                setLocal({
                  ...local,
                  advancement_score_scope: e.target.value as 'source_round' | 'all_rounds',
                })
              }
            >
              {ADVANCEMENT_SCORE_SCOPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              {
                ADVANCEMENT_SCORE_SCOPE_OPTIONS.find(
                  (o) => o.value === (local.advancement_score_scope ?? 'source_round')
                )?.hint
              }
            </p>
          </div>
        ) : null}

        {!toFinal && relationshipCarryOverUiAllowed(effectiveMethod) && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(local.carry_over_enabled)}
              onChange={(e) =>
                setLocal({
                  ...local,
                  carry_over_enabled: e.target.checked,
                })
              }
            />
            Carry over prior rounds in scoring
          </label>
        )}
        <div>
          <Label>Tiebreaker</Label>
          <select
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            value={String(local.tiebreaker_rule ?? '')}
            onChange={(e) =>
              setLocal({
                ...local,
                tiebreaker_rule: e.target.value === '' ? undefined : e.target.value,
              })
            }
          >
            <option value="">(default)</option>
            {RELATIONSHIP_TIEBREAKER_RULES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Advancement score basis</Label>
          <select
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            value={String(local.advancement_score_basis ?? '')}
            onChange={(e) =>
              setLocal({
                ...local,
                advancement_score_basis:
                  e.target.value === '' ? undefined : (e.target.value as 'scratch' | 'handicap'),
              })
            }
          >
            {ADVANCEMENT_SCORE_BASIS_OPTIONS.map((o) => (
              <option key={o.value || 'def'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {shouldShowExecutionOrder && (
          <>
            <Input
              label="Execution order from this source"
              type="number"
              data-guide-id="guide-format-rel-execution-order"
              value={String(local.execution_order ?? 0)}
              onChange={(e) =>
                setLocal({ ...local, execution_order: parseInt(e.target.value, 10) || 0 })
              }
              fullWidth
            />
            <p className="text-xs text-text-muted -mt-2">
              Lower values run first among arrows leaving the same source round.
            </p>
          </>
        )}

        {(effectiveMethod === AdvancementMethod.ELIMINATOR || toFinal) && (
          <div>
            <Label>Duplicate advancement policy</Label>
            <select
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
              value={String(
                local.duplicate_advancement_policy ?? DuplicateAdvancementPolicy.SINGLE_AND_PROMOTE
              )}
              onChange={(e) =>
                setLocal({
                  ...local,
                  duplicate_advancement_policy: e.target.value as DuplicateAdvancementPolicy,
                })
              }
            >
              {(Object.values(DuplicateAdvancementPolicy) as string[]).map((v) => (
                <option key={v} value={v}>
                  {DUPLICATE_POLICY_LABELS[v as DuplicateAdvancementPolicy] ?? v}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Description"
          value={String(local.description ?? '')}
          onChange={(e) => setLocal({ ...local, description: e.target.value })}
          fullWidth
        />
      </div>
    </Modal>
  );
};

export default TemplateRelationshipEditorModal;
