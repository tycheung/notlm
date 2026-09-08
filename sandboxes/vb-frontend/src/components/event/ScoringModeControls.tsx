import React from 'react';
import type {
  ScoringParticipantSortOrder,
  ScoringTabMode,
  ScoringViewMode,
  TeamScoringMode,
} from '../../hooks/useScoringTabMode';

interface ScoringModeControlsProps {
  scoringTabMode: ScoringTabMode;
  onScoringTabModeChange: (mode: ScoringTabMode) => void;
  scoringViewMode?: ScoringViewMode;
  onScoringViewModeChange?: (mode: ScoringViewMode) => void;
  isTeamEvent?: boolean;
  teamScoringMode?: TeamScoringMode;
  onTeamScoringModeChange?: (mode: TeamScoringMode) => void;
  showParticipantSort?: boolean;
  participantSortOrder?: ScoringParticipantSortOrder;
  onParticipantSortOrderChange?: (mode: ScoringParticipantSortOrder) => void;
}

const ScoringModeControls: React.FC<ScoringModeControlsProps> = ({
  scoringTabMode,
  onScoringTabModeChange,
  scoringViewMode,
  onScoringViewModeChange,
  isTeamEvent = false,
  teamScoringMode = 'mixed',
  onTeamScoringModeChange,
  showParticipantSort = false,
  participantSortOrder = 'assignment',
  onParticipantSortOrderChange,
}) => {
  return (
    <div className="flex items-center gap-2 mr-2">
      {scoringViewMode && onScoringViewModeChange && (
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Scoring view"
        >
          <span className="text-sm text-text-muted whitespace-nowrap">View</span>
          <div className="relative inline-grid h-9 w-[17.5rem] grid-cols-3 rounded-full border border-border bg-surface-light p-0.5 shadow-inner">
            <div
              className="pointer-events-none absolute top-0.5 bottom-0.5 w-[calc(33.333%-3px)] rounded-full bg-primary shadow-sm transition-[left] duration-200 ease-out"
              style={{
                left:
                  scoringViewMode === 'entry'
                    ? '2px'
                    : scoringViewMode === 'reconcile'
                      ? 'calc(33.333% + 1px)'
                      : 'calc(66.666% + 1px)',
              }}
              aria-hidden
            />
            <button
              type="button"
              aria-pressed={scoringViewMode === 'entry'}
              onClick={() => onScoringViewModeChange('entry')}
              className={`relative z-10 rounded-full px-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                scoringViewMode === 'entry'
                  ? 'text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Entry
            </button>
            <button
              type="button"
              aria-pressed={scoringViewMode === 'reconcile'}
              onClick={() => onScoringViewModeChange('reconcile')}
              className={`relative z-10 rounded-full px-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                scoringViewMode === 'reconcile'
                  ? 'text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Reconcile
            </button>
            <button
              type="button"
              aria-pressed={scoringViewMode === 'lanes'}
              onClick={() => onScoringViewModeChange('lanes')}
              className={`relative z-10 rounded-full px-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                scoringViewMode === 'lanes'
                  ? 'text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Lanes
            </button>
          </div>
        </div>
      )}
      {isTeamEvent && onTeamScoringModeChange && (
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Scoring mode"
        >
          <span className="text-sm text-text-muted whitespace-nowrap">Scoring</span>
          <div className="relative inline-grid h-9 w-[16.5rem] grid-cols-3 rounded-full border border-border bg-surface-light p-0.5 shadow-inner">
            <div
              className="pointer-events-none absolute top-0.5 bottom-0.5 w-[calc(33.333%-3px)] rounded-full bg-primary shadow-sm transition-[left] duration-200 ease-out"
              style={{
                left:
                  teamScoringMode === 'individual'
                    ? '2px'
                    : teamScoringMode === 'mixed'
                      ? 'calc(33.333% + 1px)'
                      : 'calc(66.666% + 1px)',
              }}
              aria-hidden
            />
            <button
              type="button"
              aria-pressed={teamScoringMode === 'individual'}
              onClick={() => onTeamScoringModeChange('individual')}
              className={`relative z-10 flex h-full items-center justify-center rounded-full px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                teamScoringMode === 'individual'
                  ? 'text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              aria-pressed={teamScoringMode === 'mixed'}
              onClick={() => onTeamScoringModeChange('mixed')}
              className={`relative z-10 flex h-full items-center justify-center rounded-full px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                teamScoringMode === 'mixed'
                  ? 'text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Mixed
            </button>
            <button
              type="button"
              aria-pressed={teamScoringMode === 'team'}
              onClick={() => onTeamScoringModeChange('team')}
              className={`relative z-10 flex h-full items-center justify-center rounded-full px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                teamScoringMode === 'team'
                  ? 'text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Team
            </button>
          </div>
        </div>
      )}
      {showParticipantSort && onParticipantSortOrderChange && (
        <label className="flex items-center gap-2 text-sm text-text-muted whitespace-nowrap">
          Sort
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text"
            value={participantSortOrder}
            onChange={(e) =>
              onParticipantSortOrderChange(e.target.value as ScoringParticipantSortOrder)
            }
            aria-label="Sort participants for score entry"
          >
            <option value="assignment">Squad order</option>
            <option value="name">Name (A–Z)</option>
            <option value="starting_lane">Starting lane</option>
          </select>
        </label>
      )}
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Scoring grid tab direction"
      >
        <span className="text-sm text-text-muted whitespace-nowrap">Tab</span>
        <div className="relative inline-grid h-9 w-[11.5rem] grid-cols-2 rounded-full border border-border bg-surface-light p-0.5 shadow-inner">
          <div
            className="pointer-events-none absolute top-0.5 bottom-0.5 w-[calc(50%-3px)] rounded-full bg-primary shadow-sm transition-[left] duration-200 ease-out"
            style={{
              left: scoringTabMode === 'horizontal' ? '2px' : 'calc(50% + 1px)',
            }}
            aria-hidden
          />
          <button
            type="button"
            aria-pressed={scoringTabMode === 'horizontal'}
            onClick={() => onScoringTabModeChange('horizontal')}
            className={`relative z-10 rounded-full px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              scoringTabMode === 'horizontal'
                ? 'text-white'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Horizontal
          </button>
          <button
            type="button"
            aria-pressed={scoringTabMode === 'vertical'}
            onClick={() => onScoringTabModeChange('vertical')}
            className={`relative z-10 rounded-full px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              scoringTabMode === 'vertical'
                ? 'text-white'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Vertical
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoringModeControls;
