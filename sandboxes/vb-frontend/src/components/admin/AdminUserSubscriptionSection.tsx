import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Label from '../common/Label';
import { getErrorMessage } from '../../api/apiErrors';
import {
  PassKind,
  TdAccessAPI,
  TdAccessPlan,
  TdBillingSummary,
} from '../../api/tdAccess';
import { Role } from '../../types/user';
import { roleDisplayLabel } from '../../utils/roles';

const PLAN_LABELS: Record<TdAccessPlan, string> = {
  monthly: 'Monthly (Standard)',
  annual: 'Annual (Standard)',
  side_action_monthly: 'Monthly (Side Action)',
  side_action_annual: 'Annual (Side Action)',
};

const PASS_LABELS: Record<PassKind, string> = {
  tournament: 'Tournament passes',
  side_action: 'Side Action passes',
  large_cap_lift: 'Large cap lifts',
};

function formatRemaining(endIso: string | null | undefined): string {
  if (!endIso) return 'No end date';
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return endIso;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return `Ended ${end.toLocaleDateString()}`;
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${days} day${days === 1 ? '' : 's'} left (ends ${end.toLocaleDateString()})`;
}

export type PendingSubscriptionDraft = {
  isAdmin: boolean;
  plan: TdAccessPlan | '';
  addDays: number;
  /** YYYY-MM-DD when extendMode is ``date``. */
  periodEnd: string;
  extendMode: 'days' | 'date';
  passes: Record<PassKind, number>;
};

export const emptySubscriptionDraft = (): PendingSubscriptionDraft => ({
  isAdmin: false,
  plan: '',
  addDays: 30,
  periodEnd: '',
  extendMode: 'days',
  passes: { tournament: 0, side_action: 0, large_cap_lift: 0 },
});

/** Apply draft grants after a new user is created (create-user flow). */
export async function applySubscriptionDraft(
  userId: number,
  draft: PendingSubscriptionDraft
): Promise<void> {
  if (draft.isAdmin) {
    await TdAccessAPI.adminSetAdminFlag(userId, true);
    return;
  }
  if (draft.plan) {
    if (draft.extendMode === 'date' && draft.periodEnd) {
      await TdAccessAPI.adminUpdateSubscription(userId, {
        plan: draft.plan,
        set_period_end: `${draft.periodEnd}T23:59:59`,
      });
    } else {
      await TdAccessAPI.adminUpdateSubscription(userId, {
        plan: draft.plan,
        add_days: Math.max(1, draft.addDays || 30),
      });
    }
  }
  for (const kind of Object.keys(draft.passes) as PassKind[]) {
    const count = draft.passes[kind];
    if (count > 0) {
      await TdAccessAPI.adminAdjustPasses(userId, { kind, delta: count });
    }
  }
}

function previewEffectiveRole(
  isAdmin: boolean,
  billing: TdBillingSummary | null,
  roleHint?: Role | string | null
): string {
  if (isAdmin) return roleDisplayLabel(Role.ADMIN);
  const plan = billing?.subscription?.plan;
  if (plan === 'monthly' || plan === 'annual') {
    return roleDisplayLabel(Role.TD);
  }
  if ((billing?.passes.tournament ?? 0) > 0) return roleDisplayLabel(Role.TD);
  if (plan === 'side_action_monthly' || plan === 'side_action_annual') {
    return roleDisplayLabel(Role.SA);
  }
  if ((billing?.passes.side_action ?? 0) > 0) return roleDisplayLabel(Role.SA);
  if (roleHint === Role.GUEST || roleHint === 'guest') {
    return roleDisplayLabel(Role.GUEST);
  }
  return roleDisplayLabel(Role.BOWLER);
}

interface AdminUserSubscriptionSectionProps {
  /** When set, load/mutate billing for this user (edit mode). */
  userId?: number | null;
  /** Current role from UserRead (edit) or draft preview (create). */
  currentRole?: Role | string | null;
  initialBilling?: TdBillingSummary | null;
  /** Create mode: collect draft instead of calling APIs immediately. */
  draftMode?: boolean;
  draft?: PendingSubscriptionDraft;
  onDraftChange?: (draft: PendingSubscriptionDraft) => void;
  onRoleChanged?: (role: string) => void;
  disabled?: boolean;
}

const AdminUserSubscriptionSection: React.FC<AdminUserSubscriptionSectionProps> = ({
  userId,
  currentRole,
  initialBilling = null,
  draftMode = false,
  draft,
  onDraftChange,
  onRoleChanged,
  disabled = false,
}) => {
  const [billing, setBilling] = useState<TdBillingSummary | null>(initialBilling);
  const [role, setRole] = useState<string>(String(currentRole || Role.BOWLER));
  const [isAdmin, setIsAdmin] = useState(currentRole === Role.ADMIN);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<TdAccessPlan | ''>('monthly');
  const [addDays, setAddDays] = useState(30);
  const [endDate, setEndDate] = useState('');
  const [extendMode, setExtendMode] = useState<'days' | 'date'>('days');

  const refresh = useCallback(async () => {
    if (!userId) return;
    const res = await TdAccessAPI.adminGetUserBilling(userId);
    setBilling(res.billing);
    setRole(res.role);
    setIsAdmin(res.role === Role.ADMIN);
    onRoleChanged?.(res.role);
  }, [userId, onRoleChanged]);

  useEffect(() => {
    setBilling(initialBilling);
  }, [initialBilling]);

  useEffect(() => {
    setRole(String(currentRole || Role.BOWLER));
    setIsAdmin(currentRole === Role.ADMIN || currentRole === 'admin');
  }, [currentRole]);

  useEffect(() => {
    if (draftMode || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await TdAccessAPI.adminGetUserBilling(userId);
        if (cancelled) return;
        setBilling(res.billing);
        setRole(res.role);
        setIsAdmin(res.role === Role.ADMIN);
      } catch {
        /* keep initial */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, draftMode]);

  const effectiveLabel = useMemo(() => {
    if (draftMode && draft) {
      const previewBilling: TdBillingSummary = {
        subscription: draft.plan
          ? {
              plan: draft.plan,
              status: 'active',
              current_period_end: null,
              cancel_at_period_end: false,
            }
          : null,
        passes: { ...draft.passes },
        has_ever_subscribed: Boolean(draft.plan),
        can_write_director_ops: true,
        director_read_only: false,
      };
      return previewEffectiveRole(draft.isAdmin, previewBilling);
    }
    return previewEffectiveRole(isAdmin, billing, role);
  }, [draftMode, draft, isAdmin, billing, role]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      if (!draftMode) await refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Subscription update failed.'));
    } finally {
      setBusy(false);
    }
  };

  const onAdminToggle = (checked: boolean) => {
    if (draftMode && draft && onDraftChange) {
      onDraftChange({ ...draft, isAdmin: checked });
      return;
    }
    if (!userId) return;
    void run(async () => {
      const res = await TdAccessAPI.adminSetAdminFlag(userId, checked);
      setBilling(res.billing);
      setRole(res.role);
      setIsAdmin(res.role === Role.ADMIN);
      onRoleChanged?.(res.role);
    });
  };

  const adjustPass = (kind: PassKind, delta: number) => {
    if (draftMode && draft && onDraftChange) {
      const next = Math.max(0, (draft.passes[kind] || 0) + delta);
      onDraftChange({
        ...draft,
        passes: { ...draft.passes, [kind]: next },
      });
      return;
    }
    if (!userId) return;
    void run(async () => {
      await TdAccessAPI.adminAdjustPasses(userId, { kind, delta });
    });
  };

  const applyExtend = () => {
    if (draftMode && draft && onDraftChange) {
      if (!plan) {
        setError('Select a plan to grant on create.');
        return;
      }
      if (extendMode === 'date' && !endDate) {
        setError('Pick an end date.');
        return;
      }
      onDraftChange({
        ...draft,
        plan,
        extendMode,
        addDays: extendMode === 'days' ? Math.max(1, addDays) : draft.addDays,
        periodEnd: extendMode === 'date' ? endDate : '',
      });
      return;
    }
    if (!userId) return;
    void run(async () => {
      if (extendMode === 'days') {
        await TdAccessAPI.adminUpdateSubscription(userId, {
          plan: plan || undefined,
          add_days: Math.max(1, addDays),
        });
      } else {
        if (!endDate) {
          setError('Pick an end date.');
          return;
        }
        await TdAccessAPI.adminUpdateSubscription(userId, {
          plan: plan || undefined,
          // Naive UTC end-of-day (no timezone serialization).
          set_period_end: `${endDate}T23:59:59`,
        });
      }
    });
  };

  const clearSub = () => {
    if (draftMode && draft && onDraftChange) {
      onDraftChange({
        ...draft,
        plan: '',
        addDays: 30,
        periodEnd: '',
        extendMode: 'days',
      });
      return;
    }
    if (!userId) return;
    void run(async () => {
      await TdAccessAPI.adminUpdateSubscription(userId, { clear: true });
    });
  };

  const adminChecked = draftMode ? Boolean(draft?.isAdmin) : isAdmin;
  const passCounts = draftMode
    ? draft?.passes || emptySubscriptionDraft().passes
    : billing?.passes || { tournament: 0, side_action: 0, large_cap_lift: 0 };
  const sub = billing?.subscription;
  const draftGrantSummary = (() => {
    if (!draft?.plan) return 'None (bowler until a plan or passes are granted)';
    const planLabel = PLAN_LABELS[draft.plan];
    if (draft.extendMode === 'date' && draft.periodEnd) {
      return `${planLabel} — will set end date ${draft.periodEnd} on create`;
    }
    return `${planLabel} — will grant ${draft.addDays} days on create`;
  })();

  return (
    <section className="mt-6 pt-4 border-t border-border" data-testid="admin-subscription-section">
      <h3 className="text-base font-semibold text-text mb-1">Subscription</h3>
      <p className="text-sm text-text-muted mb-3">
        Access is managed by subscription and passes. Effective role:{' '}
        <span className="font-medium text-text">{effectiveLabel}</span>
      </p>

      {error && (
        <div className="mb-3 p-2 text-sm bg-danger/15 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      <Label className="flex items-center text-sm mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={adminChecked}
          disabled={disabled || busy}
          onChange={(e) => onAdminToggle(e.target.checked)}
          className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
          data-testid="admin-subscription-admin-flag"
        />
        Permanent admin access (bypasses subscription)
      </Label>

      {!adminChecked && (
        <>
          <div className="mb-4 text-sm">
            <div className="font-medium text-text mb-1">Current subscription</div>
            {draftMode ? (
              <p className="text-text-muted">{draftGrantSummary}</p>
            ) : sub ? (
              <p className="text-text-muted">
                {PLAN_LABELS[sub.plan] || sub.plan} · {sub.status} ·{' '}
                {formatRemaining(sub.current_period_end)}
              </p>
            ) : (
              <p className="text-text-muted">None</p>
            )}
          </div>

          <div className="mb-4">
            <div className="font-medium text-text text-sm mb-2">Passes</div>
            <ul className="space-y-2">
              {(Object.keys(PASS_LABELS) as PassKind[]).map((kind) => (
                <li
                  key={kind}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {PASS_LABELS[kind]}:{' '}
                    <strong data-testid={`admin-subscription-pass-count-${kind}`}>
                      {passCounts[kind] ?? 0}
                    </strong>
                  </span>
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="lightbackground"
                      disabled={disabled || busy || (passCounts[kind] ?? 0) <= 0}
                      onClick={() => adjustPass(kind, -1)}
                      data-testid={`admin-subscription-pass-dec-${kind}`}
                    >
                      −
                    </Button>
                    <Button
                      type="button"
                      variant="lightbackground"
                      disabled={disabled || busy}
                      onClick={() => adjustPass(kind, 1)}
                      data-testid={`admin-subscription-pass-inc-${kind}`}
                    >
                      +
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-2">
            <div className="font-medium text-text text-sm mb-2">
              {draftMode ? 'Grant subscription on create' : 'Extend / set subscription'}
            </div>
            <div className="mb-3">
              <label className="block text-xs text-text-muted mb-1">Plan</label>
              <select
                value={plan}
                disabled={disabled || busy}
                onChange={(e) => setPlan(e.target.value as TdAccessPlan | '')}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                data-testid="admin-subscription-plan"
              >
                {!draftMode && <option value="">Keep current plan</option>}
                {(Object.keys(PLAN_LABELS) as TdAccessPlan[]).map((p) => (
                  <option key={p} value={p}>
                    {PLAN_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-xs text-text-muted mb-1">Mode</label>
                <select
                  value={extendMode}
                  disabled={disabled || busy}
                  onChange={(e) =>
                    setExtendMode(e.target.value as 'days' | 'date')
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-sm"
                  data-testid="admin-subscription-mode"
                >
                  <option value="days">Add days</option>
                  <option value="date">Set end date</option>
                </select>
              </div>
              <div>
                {extendMode === 'days' ? (
                  <Input
                    label="Days to add"
                    type="number"
                    min={1}
                    value={String(addDays)}
                    disabled={disabled || busy}
                    onChange={(e) => setAddDays(Number(e.target.value) || 0)}
                    data-testid="admin-subscription-days"
                  />
                ) : (
                  <Input
                    label="Period end"
                    type="date"
                    value={endDate}
                    disabled={disabled || busy}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="admin-subscription-period-end"
                  />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                type="button"
                variant="darkbackground"
                disabled={disabled || busy}
                onClick={applyExtend}
                data-testid="admin-subscription-apply"
              >
                {draftMode ? 'Include in create' : 'Apply'}
              </Button>
              {!draftMode && (
                <Button
                  type="button"
                  variant="lightbackground"
                  disabled={disabled || busy || !sub}
                  onClick={clearSub}
                  data-testid="admin-subscription-clear"
                >
                  Clear subscription
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default AdminUserSubscriptionSection;
