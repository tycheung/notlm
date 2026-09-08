import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Alert from '../common/Alert';
import Button from '../common/Button';
import SideActionReportPreviewModal from './reports/SideActionReportPreviewModal';
import { buildBracketConflictsReportDocument } from './reports/buildBracketConflictsReportDocument';
import type { ReportDocument } from '../../utils/sideActionReportPrint';
import {
  computeConflicts,
  summarizeConflicts,
  type BracketConflictRow,
  type ConflictHeatLevel,
} from '../../utils/bracketEngine/conflicts';
import type { Bracket, UserDisplayNames } from '../../utils/bracketEngine/types';
import { displayNameForUserId } from '../../utils/bracketEngine/types';

interface BracketConflictsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionName: string;
  brackets: Bracket[];
  userDisplayNames?: UserDisplayNames;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const heatStyles: Record<ConflictHeatLevel, string> = {
  OK: 'border-green-600/50 bg-green-600/10 text-green-400',
  ELEVATED: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  HIGH: 'border-red-500/50 bg-red-500/10 text-red-300',
};

const HeatBadge: React.FC<{ heat: ConflictHeatLevel }> = ({ heat }) => (
  <span
    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${heatStyles[heat]}`}
  >
    {heat}
  </span>
);

const BracketConflictsReportModal: React.FC<BracketConflictsReportModalProps> = ({
  isOpen,
  onClose,
  sideActionName,
  brackets,
  userDisplayNames = {},
  onRegenerate,
  isRegenerating = false,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);

  const rows = useMemo(() => computeConflicts(brackets), [brackets]);
  const summary = useMemo(() => summarizeConflicts(rows), [rows]);

  const visibleRows: BracketConflictRow[] = useMemo(() => {
    if (showAll) return rows;
    return rows.filter((row) => row.heat !== 'OK');
  }, [rows, showAll]);

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Conflicts report — ${sideActionName}`}
      size="large"
      closeOnOutsideClick
    >
      {brackets.length === 0 ? (
        <p className="text-sm text-text-muted py-4">
          Generate brackets first to review pairwise conflict data.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Pairwise breakdown across {brackets.length} bracket
            {brackets.length === 1 ? '' : 's'}. <strong className="text-text">Co</strong> = shared
            brackets; <strong className="text-text">G1</strong> = direct Game 1 opponents;{' '}
            <strong className="text-text">G2 pos</strong> / <strong className="text-text">Final pos</strong>{' '}
            = could meet in that round. Heat flags G1 frequency vs co-occurrence (see handoff).
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-text-muted">
              {summary.total} pair{summary.total === 1 ? '' : 's'} with shared brackets
            </span>
            {summary.high > 0 && (
              <span className="text-red-300 font-medium">{summary.high} HIGH</span>
            )}
            {summary.elevated > 0 && (
              <span className="text-amber-300 font-medium">{summary.elevated} ELEVATED</span>
            )}
            {summary.high === 0 && summary.elevated === 0 && (
              <span className="text-green-400 font-medium">No elevated G1 conflicts</span>
            )}
          </div>

          {summary.high > 0 && onRegenerate && (
            <Alert
              variant="warning"
              message={`${summary.high} pair${
                summary.high === 1 ? '' : 's'
              } exceed the HIGH G1 threshold. Regenerate for a fresh random distribution.`}
              action={
                <Button
                  variant="primary"
                  size="small"
                  onClick={onRegenerate}
                  isLoading={isRegenerating}
                  disabled={isRegenerating}
                >
                  Regenerate brackets
                </Button>
              }
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Show all pairs (including OK)
            </label>
            <Button
              type="button"
              variant="lightbackground"
              size="small"
              onClick={() =>
                setPreviewDoc(
                  buildBracketConflictsReportDocument({
                    sideActionName,
                    rows,
                    userDisplayNames,
                    includeOk: showAll,
                    bracketCount: brackets.length,
                  })
                )
              }
            >
              Print
            </Button>
            <span className="text-xs text-text-dim">
              Showing {visibleRows.length} of {rows.length}
            </span>
          </div>

          {visibleRows.length === 0 ? (
            <Alert
              variant="success"
              message={
                showAll
                  ? 'No bowler pairs share a bracket.'
                  : 'No ELEVATED or HIGH G1 conflicts — toggle “Show all pairs” for the full grid.'
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border max-h-[min(60vh,520px)]">
              <table className="min-w-full divide-y divide-border text-sm" aria-label="Bracket conflict pairs">
                <thead className="bg-primary sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-text uppercase">
                      Pair
                    </th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-text uppercase">
                      Co
                    </th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-text uppercase">
                      G1
                    </th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-text uppercase">
                      G2 pos
                    </th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-text uppercase">
                      G2 act
                    </th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-text uppercase">
                      Final pos
                    </th>
                    <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-text uppercase">
                      Final act
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-text uppercase">
                      Heat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleRows.map((row) => (
                    <tr key={`${row.a}|${row.b}`}>
                      <td className="px-3 py-2 text-text whitespace-nowrap">
                        {displayNameForUserId(row.a, userDisplayNames)} /{' '}
                        {displayNameForUserId(row.b, userDisplayNames)}
                      </td>
                      <td className="px-2 py-2 text-right text-text-muted tabular-nums">
                        {row.co}
                      </td>
                      <td className="px-2 py-2 text-right text-text font-medium tabular-nums">
                        {row.g1}
                      </td>
                      <td className="px-2 py-2 text-right text-text-muted tabular-nums">
                        {row.g2pot}
                      </td>
                      <td className="px-2 py-2 text-right text-text-muted tabular-nums">
                        {row.g2act}
                      </td>
                      <td className="px-2 py-2 text-right text-text-muted tabular-nums">
                        {row.g3pot}
                      </td>
                      <td className="px-2 py-2 text-right text-text-muted tabular-nums">
                        {row.g3act}
                      </td>
                      <td className="px-3 py-2">
                        <HeatBadge heat={row.heat} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
    <SideActionReportPreviewModal
      isOpen={previewDoc != null}
      onClose={() => setPreviewDoc(null)}
      document={previewDoc}
    />
    </>
  );
};

export default BracketConflictsReportModal;
