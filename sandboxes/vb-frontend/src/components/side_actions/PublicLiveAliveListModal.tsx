import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SideActionsAPI } from '../../api/side-actions';
import { getErrorMessage } from '../../api/apiErrors';
import {
  effectiveByePrizeDistribution,
  effectivePrizeDistribution,
} from '../../features/side-actions/shared';
import {
  getStoredBrackets,
  getUserDisplayNames,
} from '../../utils/sideActionBracketStorage';
import {
  buildSpectatorAliveListFromSideAction,
  type SpectatorAliveListRow,
} from '../../utils/spectatorAliveList';
import Alert from '../common/Alert';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import SideActionBracketDiagram from './SideActionBracketDiagram';
import { displayBracketNumber as eventBracketNumber } from '../../utils/bracketDisplayNumber';
import { competitorColumnLabel, entryUnitFromTypeConfig } from '../../features/side-actions/competitorLabel';

interface PublicLiveAliveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
  tournamentId: number;
  eventId: number;
}

type AliveListStep = 'list' | 'bowler' | 'bracket';

function placeSummary(row: SpectatorAliveListRow): string {
  const parts: string[] = [];
  if (row.firstCount > 0) parts.push(`${row.firstCount} 1st`);
  if (row.secondCount > 0) parts.push(`${row.secondCount} 2nd`);
  if (row.splitCount > 0) {
    parts.push(`${row.splitCount} ${row.splitCount === 1 ? 'tie' : 'ties'}`);
  }
  return parts.join(', ') || '—';
}

function distributionHasMoney(dist: Record<string, number>): boolean {
  return Object.values(dist).some((v) => Number(v) > 0);
}

/**
 * Spectator / bowler alive (live) list for a bracket side action.
 * Flow: live list → bowler brackets → single bracket diagram (with back).
 */
const PublicLiveAliveListModal: React.FC<PublicLiveAliveListModalProps> = ({
  isOpen,
  onClose,
  sideActionId,
  sideActionName,
}) => {
  const [poolId, setPoolId] = useState<number | null>(null);
  const [step, setStep] = useState<AliveListStep>('list');
  const [selectedRow, setSelectedRow] = useState<SpectatorAliveListRow | null>(null);
  const [selectedBracketNumber, setSelectedBracketNumber] = useState<number | null>(null);

  const {
    data: sideAction,
    isLoading: saLoading,
    isError: saError,
    error: saErr,
  } = useQuery({
    queryKey: ['liveBracketSideAction', sideActionId],
    queryFn: () => SideActionsAPI.getSideAction(sideActionId),
    enabled: isOpen && sideActionId > 0,
    staleTime: 15_000,
    refetchInterval: isOpen ? 20_000 : false,
  });

  const enabledPools = useMemo(
    () => (sideAction?.pools ?? []).filter((p) => p.is_enabled !== false),
    [sideAction?.pools]
  );

  React.useEffect(() => {
    if (!isOpen) {
      setStep('list');
      setSelectedRow(null);
      setSelectedBracketNumber(null);
      setPoolId(null);
      return;
    }
    if (enabledPools.length >= 1 && (poolId == null || !enabledPools.some((p) => p.id === poolId))) {
      setPoolId(enabledPools[0].id);
    }
  }, [isOpen, enabledPools, poolId]);

  const report = useMemo(() => {
    if (!sideAction || poolId == null) return null;
    return buildSpectatorAliveListFromSideAction(sideAction, poolId);
  }, [sideAction, poolId]);

  const selectedPool = useMemo(
    () => (sideAction?.pools ?? []).find((p) => p.id === poolId) ?? null,
    [sideAction?.pools, poolId]
  );

  const poolBrackets = useMemo(
    () =>
      selectedPool
        ? getStoredBrackets({ bracket_engine: selectedPool.bracket_engine })
        : [],
    [selectedPool]
  );

  const userDisplayNames = useMemo(
    () =>
      selectedPool
        ? getUserDisplayNames({ bracket_engine: selectedPool.bracket_engine })
        : {},
    [selectedPool]
  );

  const activeBracket = useMemo(() => {
    if (selectedBracketNumber == null) return null;
    const offset = selectedPool?.bracket_number_offset ?? 0;
    const idx = poolBrackets.findIndex(
      (b, i) => eventBracketNumber(b, offset, i) === selectedBracketNumber
    );
    return idx >= 0 ? poolBrackets[idx] : null;
  }, [poolBrackets, selectedBracketNumber, selectedPool?.bracket_number_offset]);

  const prizeDist =
    sideAction && selectedPool
      ? effectivePrizeDistribution(sideAction, selectedPool.id)
      : {};
  const byeDist =
    sideAction && selectedPool
      ? effectiveByePrizeDistribution(sideAction, selectedPool.id)
      : {};
  const showPayouts = distributionHasMoney(prizeDist) || distributionHasMoney(byeDist);
  const payouts = {
    first: Number(prizeDist['1'] ?? prizeDist.first ?? 0),
    second: Number(prizeDist['2'] ?? prizeDist.second ?? 0),
  };
  const byePayouts = {
    first: Number(byeDist['1'] ?? byeDist.first ?? prizeDist['1'] ?? prizeDist.first ?? 0),
    second: Number(
      byeDist['2'] ?? byeDist.second ?? prizeDist['2'] ?? prizeDist.second ?? 0
    ),
  };

  const rows = report?.rows ?? [];
  const loading = saLoading;
  const competitorLabel = competitorColumnLabel(
    entryUnitFromTypeConfig(sideAction?.type_config)
  );

  const modalTitle = (() => {
    if (step === 'bracket' && selectedBracketNumber != null) {
      return `Bracket #${selectedBracketNumber}`;
    }
    if (step === 'bowler' && selectedRow) return selectedRow.displayName;
    return `Live list — ${sideActionName}`;
  })();

  const handleClose = () => {
    setStep('list');
    setSelectedRow(null);
    setSelectedBracketNumber(null);
    onClose();
  };

  const openBowler = (row: SpectatorAliveListRow) => {
    setSelectedRow(row);
    setSelectedBracketNumber(null);
    setStep('bowler');
  };

  const openBracket = (bracketNumber: number) => {
    setSelectedBracketNumber(bracketNumber);
    setStep('bracket');
  };

  const backFromBracket = () => {
    setSelectedBracketNumber(null);
    setStep('bowler');
  };

  const backFromBowler = () => {
    setSelectedRow(null);
    setSelectedBracketNumber(null);
    setStep('list');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="large"
      className="max-h-[90vh]"
    >
      <div className="space-y-4">
        {saError && (
          <Alert variant="error" message={getErrorMessage(saErr, 'Could not load side action.')} />
        )}

        {step === 'list' && enabledPools.length > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="alive-pool" className="text-sm font-medium text-text shrink-0">
              Squad
            </label>
            <select
              id="alive-pool"
              className="min-h-11 w-full rounded-md border border-border bg-surface text-text px-3 text-sm"
              value={poolId ?? ''}
              onChange={(e) => setPoolId(Number(e.target.value))}
            >
              {enabledPools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.squad_name || `Pool ${p.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && <Loading />}

        {!loading && !saError && report && step === 'list' && (
          <>
            <p className="text-sm text-text-muted">
              {report.bracketCount === 0
                ? 'No brackets generated yet for this squad.'
                : report.complete
                  ? `Brackets are complete — place counts by ${competitorLabel.toLowerCase()}.`
                  : `Brackets still in progress — alive bracket counts by ${competitorLabel.toLowerCase()}.`}{' '}
              {report.bracketCount > 0
                ? `Tap a ${competitorLabel.toLowerCase()} to see which brackets they are in.`
                : null}
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-text-muted">
                {report.bracketCount === 0
                  ? 'Generate brackets to populate the live list.'
                  : `No ${competitorLabel.toLowerCase()}s on the live list yet.`}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-light text-left text-text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">{competitorLabel}</th>
                      <th className="px-3 py-2 font-medium text-right">
                        {report.complete ? 'Places' : 'Alive'}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {report.complete ? 'Detail' : 'Brackets'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.userId}>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-left text-primary hover:underline min-h-11 font-medium"
                            onClick={() => openBowler(row)}
                          >
                            {row.displayName}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-text">
                          {report.complete
                            ? row.firstCount + row.secondCount + row.splitCount
                            : row.aliveCount}
                        </td>
                        <td className="px-3 py-2 text-text-muted">
                          {report.complete
                            ? placeSummary(row)
                            : row.bracketNumbers.join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!loading && !saError && selectedRow && step === 'bowler' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={backFromBowler}
              className="text-sm text-primary hover:underline min-h-11 inline-flex items-center"
            >
              ← Back to live list
            </button>
            <div>
              <h3 className="text-base font-semibold text-primary">{selectedRow.displayName}</h3>
              <p className="text-sm text-text-muted mt-1">
                {report?.complete
                  ? placeSummary(selectedRow)
                  : `${selectedRow.aliveCount} bracket${selectedRow.aliveCount === 1 ? '' : 's'} still alive`}
                {' · '}
                Tap a bracket number to open it.
              </p>
            </div>
            {(selectedRow.bracketNumbers ?? []).length === 0 ? (
              <p className="text-sm text-text-muted">No bracket numbers for this bowler.</p>
            ) : (
              <ul className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {selectedRow.bracketNumbers.map((n) => (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => openBracket(n)}
                      className="w-full min-h-11 rounded-md border border-border bg-surface-light px-2 py-2 text-center text-sm font-medium text-primary hover:border-primary hover:bg-primary/10"
                    >
                      #{n}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!loading && !saError && step === 'bracket' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={backFromBracket}
              className="text-sm text-primary hover:underline min-h-11 inline-flex items-center"
            >
              ← Back to {selectedRow?.displayName ?? 'bowler'}
            </button>
            {activeBracket ? (
              <SideActionBracketDiagram
                bracket={activeBracket}
                userDisplayNames={userDisplayNames}
                payouts={showPayouts ? payouts : undefined}
                byePayouts={showPayouts ? byePayouts : undefined}
                gameNumbers={selectedPool?.game_numbers ?? []}
                showPayouts={showPayouts}
                bracketNumberOffset={selectedPool?.bracket_number_offset ?? 0}
              />
            ) : (
              <Alert
                variant="error"
                message={`Could not find bracket #${selectedBracketNumber ?? ''} in this squad.`}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PublicLiveAliveListModal;
