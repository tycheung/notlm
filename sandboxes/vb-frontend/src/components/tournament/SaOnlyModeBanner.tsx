import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '../common/Alert';
import Button from '../common/Button';
import { TdAccessAPI } from '../../api/tdAccess';
import { getErrorMessage } from '../../api/apiErrors';

interface SaOnlyModeBannerProps {
  tournamentId: number;
  eventId?: number | null;
}

const SaOnlyModeBanner: React.FC<SaOnlyModeBannerProps> = ({
  tournamentId,
  eventId,
}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const autoUpgradeTried = useRef(false);
  const { data: access } = useQuery({
    queryKey: ['tournamentAccess', tournamentId],
    queryFn: () => TdAccessAPI.getTournamentAccess(tournamentId),
  });

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError(null);
    try {
      await TdAccessAPI.upgradeFromSaOnly(tournamentId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['tournamentAccess', tournamentId] }),
        eventId
          ? queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] })
          : Promise.resolve(),
      ]);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Could not upgrade. Subscribe or apply a tournament credit, then try again.'
        )
      );
    } finally {
      setUpgrading(false);
    }
  };

  useEffect(() => {
    if (autoUpgradeTried.current) return;
    // Only Standard Annual/Monthly unlocks a free SA→full upgrade (not SA-only SKUs).
    if (!access?.has_standard_subscription) return;
    autoUpgradeTried.current = true;
    void handleUpgrade();
    // Auto-upgrade is a POST; only trigger when access payload says Standard subscribed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  return (
    <div className="mb-4">
      <Alert
        variant="info"
        message={
          <div className="space-y-2">
            <p>
              This is a <strong>side action only</strong> event. Pinfall is for
              side actions — it does not feed averages or standings until you
              upgrade to a full tournament.
            </p>
            <p className="text-sm">
              One event, one qualifying round, one squad. Not publicly listed;
              approved participants can still view side actions.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              type="button"
              size="small"
              onClick={() => void handleUpgrade()}
              disabled={upgrading}
            >
              {upgrading ? 'Upgrading…' : 'Upgrade to full tournament'}
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default SaOnlyModeBanner;
