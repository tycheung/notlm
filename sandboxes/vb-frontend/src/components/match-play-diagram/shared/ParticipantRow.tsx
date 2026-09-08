import React from 'react';
import AdvancementDestinationMark from '../../event-scoring/AdvancementDestinationMark';
import type { AdvancementDestination } from '../../../utils/advancementDestinations';
import ScoreBoxInput from './ScoreBoxInput';

export interface ParticipantRowScore {
  gameIndex: number;
  score: number | null;
  gameId: number | null;
  disabled: boolean;
}

export interface ParticipantRowProps {
  name: string | null | undefined;
  scores?: ParticipantRowScore[];
  isWinner?: boolean;
  isTbd?: boolean;
  carryOverValue?: number | null;
  advancementDestinations?: AdvancementDestination[];
  onScoreChange?: (gameIndex: number, value: number | null) => void;
  scoreAriaLabel?: (gameIndex: number) => string;
  trailing?: React.ReactNode;
  dense?: boolean;
  teamMembers?: Array<{
    event_participant_id?: number | null;
    display_name?: string | null;
  }>;
}

function displayName(name: string | null | undefined): string {
  if (!name) return 'TBD';
  return name;
}

const ParticipantRow: React.FC<ParticipantRowProps> = ({
  name,
  scores = [],
  isWinner = false,
  isTbd: isTbdProp,
  carryOverValue,
  advancementDestinations = [],
  onScoreChange,
  scoreAriaLabel,
  trailing,
  dense = false,
}) => {
  const label = displayName(name);
  const tbd = isTbdProp ?? !name;
  const showScores = scores.length > 0;
  const padClass = dense ? 'px-2 py-1' : 'px-2.5 py-2';

  return (
    <div className="flex min-h-0 flex-col gap-1">
      <div className="flex min-h-0 items-stretch gap-1.5">
        <div
          className={`flex min-w-0 flex-1 items-center rounded-md border border-border/80 bg-[#141c2b] ${padClass} ${
            isWinner ? 'ring-1 ring-success/60' : ''
          }`}
        >
          {tbd ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-primary">
              <span className="text-[10px] leading-none" aria-hidden>
                ▶
              </span>
              <span>TBD</span>
            </span>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="truncate text-sm font-medium text-text" title={label}>
                {label}
              </span>
              {advancementDestinations.length > 0 && (
                <AdvancementDestinationMark destinations={advancementDestinations} />
              )}
            </span>
          )}
        </div>
        {!showScores && !trailing && (
          <div className="flex w-11 shrink-0 items-center justify-center rounded-md border border-border/80 bg-[#141c2b] text-sm text-text-muted">
            —
          </div>
        )}
        {showScores && scores.length === 1 && (
          <ScoreBoxInput
            value={scores[0].score}
            disabled={scores[0].disabled}
            title={
              scores[0].disabled && scores[0].gameId
                ? 'Waiting for prior ladder match'
                : undefined
            }
            onChange={(value) => onScoreChange?.(scores[0].gameIndex, value)}
            ariaLabel={scoreAriaLabel?.(scores[0].gameIndex)}
          />
        )}
        {trailing}
      </div>
      {showScores && scores.length > 1 && (
        <div className="flex gap-1 pl-0.5">
          {scores.map((s) => (
            <ScoreBoxInput
              key={s.gameIndex}
              value={s.score}
              disabled={s.disabled}
              compact
              title={
                s.disabled && s.gameId ? 'Waiting for prior ladder match' : undefined
              }
              onChange={(value) => onScoreChange?.(s.gameIndex, value)}
              ariaLabel={scoreAriaLabel?.(s.gameIndex)}
            />
          ))}
        </div>
      )}
      {carryOverValue != null && (
        <span className="pl-0.5 text-[10px] text-text-muted" title="Carry-over pinfall">
          Carry: {carryOverValue}
        </span>
      )}
    </div>
  );
};

export default ParticipantRow;
