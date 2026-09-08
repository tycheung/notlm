import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import type { LaneAssignmentPreview } from '../../features/lanes/buildLaneAssignmentPreview';
import {
  buildLaneAssignmentPreviewReportDocument,
} from './buildLaneAssignmentPreviewReportDocument';
import type { LaneMovementConfig } from '../../features/lanes/types';
import SideActionReportPreviewModal from '../side_actions/reports/SideActionReportPreviewModal';
import type { ReportDocument } from '../../utils/sideActionReportPrint';

type PreviewView = 'by_lane' | 'by_team';

interface LaneAssignmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: LaneAssignmentPreview | null;
  movement: LaneMovementConfig;
  squadLabel?: string | null;
}

const LaneAssignmentPreviewModal: React.FC<LaneAssignmentPreviewModalProps> = ({
  isOpen,
  onClose,
  preview,
  movement,
  squadLabel = null,
}) => {
  const [view, setView] = useState<PreviewView>('by_lane');
  const [printDoc, setPrintDoc] = useState<ReportDocument | null>(null);

  const subtitle = useMemo(() => {
    if (!preview) return '';
    const parts = [
      squadLabel,
      `${preview.games.length} game${preview.games.length === 1 ? '' : 's'}`,
      `${preview.byTeam.length} seated`,
    ];
    if (preview.unassignedCount > 0) {
      parts.push(`${preview.unassignedCount} unassigned`);
    }
    return parts.filter(Boolean).join(' · ');
  }, [preview, squadLabel]);

  const openPrint = () => {
    if (!preview) return;
    setPrintDoc(
      buildLaneAssignmentPreviewReportDocument({
        preview,
        movement,
        squadLabel,
        view,
      })
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Preview lane assignments"
        size="full"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                className={
                  view === 'by_lane'
                    ? 'px-3 py-1.5 rounded-input bg-primary text-white text-sm'
                    : 'px-3 py-1.5 rounded-input border border-border bg-surface-light text-sm'
                }
                onClick={() => setView('by_lane')}
              >
                Games × lanes
              </button>
              <button
                type="button"
                className={
                  view === 'by_team'
                    ? 'px-3 py-1.5 rounded-input bg-primary text-white text-sm'
                    : 'px-3 py-1.5 rounded-input border border-border bg-surface-light text-sm'
                }
                onClick={() => setView('by_team')}
              >
                Teams × games
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openPrint} disabled={!preview}>
                Print / PDF
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        }
        contentClassName="min-h-0 flex-1 overflow-auto overscroll-contain px-5 py-4"
      >
        {!preview ? (
          <p className="text-sm text-text-muted">No preview available.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">{subtitle}</p>
            {preview.byTeam.length === 0 ? (
              <p className="text-sm text-text-muted">
                Assign teams to opening lanes first, then open this preview to see
                where everyone bowls each game.
              </p>
            ) : null}
            {preview.positionRoundGame != null ? (
              <p className="text-sm text-text-muted">
                Game {preview.positionRoundGame} is a position round — lanes show
                standings places (Place 1, Place 2, …), not team names.
              </p>
            ) : null}
            {preview.byTeam.length === 0 ? null : view === 'by_lane' ? (
              <div className="overflow-auto rounded-input border border-border">
                <table className="min-w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-light">
                      <th className="sticky left-0 z-10 bg-surface-light border-b border-r border-border px-2 py-1.5 text-left font-semibold text-text">
                        Game
                      </th>
                      {preview.lanes.map((lane) => (
                        <th
                          key={lane}
                          className="border-b border-border px-2 py-1.5 text-center font-semibold text-text whitespace-nowrap"
                        >
                          L{lane}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.games.map((game, gameIdx) => {
                      const isPos = preview.positionRoundGame === game;
                      return (
                      <tr key={game} className="odd:bg-surface even:bg-surface-light/40">
                        <th className="sticky left-0 z-10 bg-inherit border-r border-border px-2 py-1 text-left font-semibold text-text whitespace-nowrap">
                          {game}
                          {isPos ? (
                            <span className="ml-1 font-normal text-text-muted">
                              Position
                            </span>
                          ) : null}
                        </th>
                        {preview.byLane[gameIdx].map((cell, colIdx) => (
                          <td
                            key={`${game}-${preview.lanes[colIdx]}`}
                            className="border-b border-border/60 px-1.5 py-1 text-center text-text align-top max-w-[7rem]"
                          >
                            {cell.labels.length ? cell.labels.join(', ') : '—'}
                          </td>
                        ))}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-auto rounded-input border border-border">
                <table className="min-w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-light">
                      <th className="sticky left-0 z-10 bg-surface-light border-b border-r border-border px-2 py-1.5 text-left font-semibold text-text">
                        Team
                      </th>
                      {preview.games.map((game) => (
                        <th
                          key={game}
                          className="border-b border-border px-2 py-1.5 text-center font-semibold text-text whitespace-nowrap"
                        >
                          G{game}
                          {preview.positionRoundGame === game ? '*' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.byTeam.map((row) => (
                      <tr key={row.key} className="odd:bg-surface even:bg-surface-light/40">
                        <th className="sticky left-0 z-10 bg-inherit border-r border-border px-2 py-1 text-left font-semibold text-text whitespace-nowrap">
                          {row.label}
                          <span className="ml-1 font-normal text-text-muted">
                            (L{row.startLane})
                          </span>
                        </th>
                        {row.lanesByGame.map((lane, idx) => {
                          const isPos =
                            preview.positionRoundGame === preview.games[idx];
                          return (
                          <td
                            key={`${row.key}-${preview.games[idx]}`}
                            className="border-b border-border/60 px-1.5 py-1 text-center text-text tabular-nums"
                          >
                            {isPos ? 'pos' : lane ?? '—'}
                          </td>
                          );
                        })}
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
        isOpen={Boolean(printDoc)}
        onClose={() => setPrintDoc(null)}
        document={printDoc}
      />
    </>
  );
};

export default LaneAssignmentPreviewModal;
