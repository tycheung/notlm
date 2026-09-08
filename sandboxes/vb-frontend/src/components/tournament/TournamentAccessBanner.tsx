import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TdAccessAPI, TournamentAccessStatus } from '../../api/tdAccess';
import Alert from '../common/Alert';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';

interface TournamentAccessBannerProps {
  tournamentId: number;
}

/**
 * Shows unlock / extend CTA when TD access gating is enabled and the tournament
 * is locked or its pass window expired. Also offers large-cap lift when still on
 * the default 500 cap. Hidden when gating is off (default local/dev).
 */
const TournamentAccessBanner: React.FC<TournamentAccessBannerProps> = ({
  tournamentId,
}) => {
  const [status, setStatus] = useState<TournamentAccessStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyingLift, setApplyingLift] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);

  const load = async () => {
    try {
      const data = await TdAccessAPI.getTournamentAccess(tournamentId);
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setStatus(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const cap = status?.unique_participant_cap ?? 500;
  const liftPasses = status?.unused_large_cap_lift_credits ?? 0;
  const canLift = Boolean(status?.gating_enabled && cap < 2000);
  const canExtend = Boolean(
    status?.gating_enabled && status?.license_expired && status?.can_extend_with_pass
  );
  const locked = Boolean(
    status?.gating_enabled && !status?.runnable && !canExtend
  );

  if (!status || !status.gating_enabled || (!locked && !canLift && !canExtend)) {
    return null;
  }

  const isSa = Boolean(status.is_sa_only);
  const matchingCredits = isSa
    ? status.unused_side_action_credits ?? 0
    : status.unused_credits;
  const applyLabel = isSa ? 'Apply Side Action pass' : 'Apply tournament credit';
  const applyBusy = applying ? 'Applying…' : applyLabel;

  const handleApplyCredit = async () => {
    setApplying(true);
    setError(null);
    try {
      await TdAccessAPI.applyCredit(tournamentId);
      await load();
    } catch (err) {
      console.error(err);
      setError(
        isSa
          ? 'Could not apply a Side Action pass. Purchase a pass or start a Side Action plan first.'
          : 'Could not apply a credit. Purchase credits or start an Annual/Monthly plan first.'
      );
    } finally {
      setApplying(false);
    }
  };

  const handleApplyLift = async () => {
    setApplyingLift(true);
    setError(null);
    try {
      await TdAccessAPI.applyLargeCapLift(tournamentId);
      await load();
    } catch (err) {
      console.error(err);
      setError(
        'Could not apply a large-cap lift. Grant or purchase a lift pass first.'
      );
    } finally {
      setApplyingLift(false);
    }
  };

  const handleExtend = async () => {
    setExtending(true);
    setError(null);
    try {
      await TdAccessAPI.extendCredit(tournamentId);
      await load();
    } catch (err) {
      console.error(err);
      setError('Could not extend access. Ensure you have a matching unused pass.');
    } finally {
      setExtending(false);
      setExtendOpen(false);
    }
  };

  return (
    <div className="mb-4">
      <Alert
        variant={locked || canExtend ? 'warning' : 'info'}
        message={
          <div className="space-y-2">
            {canExtend && (
              <>
                <p>
                  The pass unlock window for this {isSa ? 'side action' : 'tournament'}{' '}
                  has expired. You can still view history. Extend access by consuming
                  another pass (+14 days).
                </p>
                <p className="text-sm">
                  Matching passes remaining: {matchingCredits}.
                </p>
              </>
            )}
            {locked && (
              <>
                <p>
                  This {isSa ? 'side action' : 'tournament'} is locked. You can finish
                  setup, but bowlers, scoring, and public live links stay blocked until
                  you unlock it.
                </p>
                <p className="text-sm">
                  {isSa ? (
                    <>
                      Unlock with an active Side Action or Standard subscription, or
                      apply one Side Action pass ({matchingCredits} unused).
                    </>
                  ) : (
                    <>
                      Unlock with an active Annual/Monthly subscription, or apply one
                      tournament credit ({status.unused_credits} unused).
                    </>
                  )}
                </p>
              </>
            )}
            {canLift && (
              <p className="text-sm">
                Unique participant cap is {cap}. Apply a large-cap lift to raise it to
                2,000 ({liftPasses} lift pass{liftPasses === 1 ? '' : 'es'} unused).
              </p>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {canExtend && (
                <Button
                  type="button"
                  size="small"
                  onClick={() => setExtendOpen(true)}
                  disabled={extending || matchingCredits < 1}
                >
                  {extending ? 'Extending…' : 'Extend with pass'}
                </Button>
              )}
              {locked && (
                <Button
                  type="button"
                  size="small"
                  onClick={handleApplyCredit}
                  disabled={applying || matchingCredits < 1}
                >
                  {applyBusy}
                </Button>
              )}
              {canLift && (
                <Button
                  type="button"
                  size="small"
                  variant="lightbackground"
                  onClick={handleApplyLift}
                  disabled={applyingLift || liftPasses < 1}
                >
                  {applyingLift ? 'Applying…' : 'Apply large-cap lift'}
                </Button>
              )}
              {(locked || canExtend || (canLift && liftPasses < 1)) && (
                <Link
                  to="/director/subscription"
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-border text-primary hover:bg-surface-light"
                >
                  Manage Subscription
                </Link>
              )}
            </div>
          </div>
        }
      />
      <ConfirmDialog
        isOpen={extendOpen}
        title="Extend access"
        message={`Are you sure? 1 pass will be consumed (${matchingCredits} remaining) to extend access by 14 days.`}
        confirmText="Extend"
        onClose={() => setExtendOpen(false)}
        onConfirm={() => {
          void handleExtend();
        }}
      />
    </div>
  );
};

export default TournamentAccessBanner;
