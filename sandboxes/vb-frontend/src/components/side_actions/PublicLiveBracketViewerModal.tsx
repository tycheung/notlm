import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Loading from '../common/Loading';
import Alert from '../common/Alert';
import Tabs from '../common/Tabs';
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
import SideActionBracketDiagram from './SideActionBracketDiagram';
import { displayBracketNumber } from '../../utils/bracketDisplayNumber';

interface PublicLiveBracketViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
}

function distributionHasMoney(dist: Record<string, number>): boolean {
  return Object.values(dist).some((v) => Number(v) > 0);
}

/**
 * Spectator bracket board: reads persisted pots from SideAction (no TD sync).
 * Dollar amounts only appear when the API left prize distributions intact.
 */
const PublicLiveBracketViewerModal: React.FC<PublicLiveBracketViewerModalProps> = ({
  isOpen,
  onClose,
  sideActionId,
  sideActionName,
}) => {
  const [activePool, setActivePool] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState(0);

  const {
    data: sideAction,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['liveBracketSideAction', sideActionId],
    queryFn: () => SideActionsAPI.getSideAction(sideActionId),
    enabled: isOpen && sideActionId > 0,
    staleTime: 15_000,
    refetchInterval: isOpen ? 30_000 : false,
  });

  const poolsWithBrackets = useMemo(() => {
    if (!sideAction) return [];
    return (sideAction.pools ?? []).filter((pool) => {
      if (!pool.is_enabled) return false;
      return getStoredBrackets({ bracket_engine: pool.bracket_engine }).length > 0;
    });
  }, [sideAction]);

  useEffect(() => {
    if (!isOpen) {
      setActivePool('');
      setActiveIndex(0);
      return;
    }
    if (poolsWithBrackets.length === 0) return;
    const stillValid = poolsWithBrackets.some((p) => String(p.id) === activePool);
    if (!stillValid) {
      setActivePool(String(poolsWithBrackets[0].id));
      setActiveIndex(0);
    }
  }, [isOpen, poolsWithBrackets, activePool]);

  useEffect(() => {
    setActiveIndex(0);
  }, [activePool]);

  const selectedPool = poolsWithBrackets.find((p) => String(p.id) === activePool);
  const brackets = selectedPool
    ? getStoredBrackets({ bracket_engine: selectedPool.bracket_engine })
    : [];
  const userDisplayNames = selectedPool
    ? getUserDisplayNames({ bracket_engine: selectedPool.bracket_engine })
    : {};
  const activeBracket = brackets[activeIndex] ?? null;

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

  const poolTabs = poolsWithBrackets.map((pool) => ({
    id: String(pool.id),
    label: pool.squad_name || `Squad ${pool.squad_id}`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Brackets — ${sideActionName}`}
      size="large"
      closeOnOutsideClick
    >
      {isLoading && <Loading />}
      {isError && (
        <Alert
          variant="error"
          message={getErrorMessage(error, 'Could not load brackets.')}
        />
      )}
      {!isLoading && !isError && poolsWithBrackets.length === 0 && (
        <p className="text-sm text-text-muted py-4">
          Brackets have not been generated for this pot yet.
        </p>
      )}
      {poolsWithBrackets.length > 0 && (
        <div className="space-y-4">
          {poolTabs.length > 1 && (
            <Tabs
              activeTab={activePool}
              tabs={poolTabs}
              onTabChange={setActivePool}
              variant="underline"
              size="sm"
              ariaLabel="Bracket squad pools"
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              {brackets.length} bracket{brackets.length === 1 ? '' : 's'}
              {selectedPool?.squad_name ? ` · ${selectedPool.squad_name}` : ''}
              {!showPayouts
                ? ' · Dollar amounts hidden unless you participated'
                : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="lightbackground"
                size="small"
                onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                disabled={activeIndex <= 0}
              >
                Previous
              </Button>
              <label className="text-sm text-text">
                <span className="sr-only">Select bracket</span>
                <select
                  value={activeIndex}
                  onChange={(e) => setActiveIndex(Number(e.target.value))}
                  className="rounded-md border border-border bg-surface-light px-2 py-1 text-sm text-text"
                >
                  {brackets.map((bracket, index) => (
                    <option key={bracket.id} value={index}>
                      Bracket{' '}
                      {displayBracketNumber(
                        bracket,
                        selectedPool?.bracket_number_offset ?? 0,
                        index
                      )}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="lightbackground"
                size="small"
                onClick={() =>
                  setActiveIndex((index) => Math.min(brackets.length - 1, index + 1))
                }
                disabled={activeIndex >= brackets.length - 1}
              >
                Next
              </Button>
            </div>
          </div>

          {activeBracket && (
            <SideActionBracketDiagram
              bracket={activeBracket}
              userDisplayNames={userDisplayNames}
              payouts={showPayouts ? payouts : undefined}
              byePayouts={showPayouts ? byePayouts : undefined}
              gameNumbers={selectedPool?.game_numbers ?? []}
              showPayouts={showPayouts}
              bracketNumberOffset={selectedPool?.bracket_number_offset ?? 0}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export default PublicLiveBracketViewerModal;
