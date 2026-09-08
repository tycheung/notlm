import React from 'react';
import Button from '../common/Button';
import Label from '../common/Label';
import type { RoundGameScoringFields } from '../../utils/roundGameScoring';

export interface DylgRoundConfigSectionProps {
  scoring: RoundGameScoringFields;
  dylgGameCount: number;
  dylgMaxDrop: number;
  isTeamEvent: boolean;
  selectCls: string;
  updateMethodConfig: (patch: Record<string, unknown>) => void;
}

const DylgRoundConfigSection: React.FC<DylgRoundConfigSectionProps> = ({
  scoring,
  dylgGameCount,
  dylgMaxDrop,
  isTeamEvent,
  selectCls,
  updateMethodConfig,
}) => (
  <div className="space-y-2">
    <Label>Drop your low game</Label>
    <p className="text-xs text-text-muted">
      Qualifying pinfall only. All games stay on the sheet; the lowest
      {scoring.dylg_drop_count && scoring.dylg_drop_count > 1
        ? ` ${scoring.dylg_drop_count} games`
        : ' game'}{' '}
      drop from the series total after the full set is in. Side actions never inherit the drop.
    </p>
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(scoring.dylg_enabled) && dylgGameCount >= 2}
        disabled={dylgGameCount < 2}
        onChange={(e) => {
          if (!e.target.checked) {
            updateMethodConfig({
              dylg_enabled: false,
              dylg_scope: null,
              dylg_drop_count: null,
            });
            return;
          }
          updateMethodConfig({
            dylg_enabled: true,
            dylg_scope:
              scoring.game_style === 'baker' || !isTeamEvent
                ? scoring.game_style === 'baker'
                  ? 'team'
                  : 'individual'
                : scoring.dylg_scope || 'individual',
            dylg_drop_count: scoring.dylg_drop_count || 1,
          });
        }}
      />
      Enable DYLG
    </label>
    {dylgGameCount < 2 && (
      <p className="text-xs text-text-muted">Needs at least 2 games in this round.</p>
    )}
    {scoring.dylg_enabled && dylgGameCount >= 2 && (
      <div className="space-y-3 pl-1">
        {isTeamEvent && scoring.game_style !== 'baker' && (
          <div>
            <Label>Drop scope</Label>
            <select
              className={selectCls}
              value={scoring.dylg_scope || 'individual'}
              onChange={(e) =>
                updateMethodConfig({
                  dylg_scope: e.target.value as 'individual' | 'team',
                })
              }
            >
              <option value="individual">Each bowler drops their own low game</option>
              <option value="team">Drop the lowest team game</option>
            </select>
          </div>
        )}
        {scoring.game_style === 'baker' && (
          <p className="text-xs text-text-muted">Baker DYLG drops the lowest Baker team game(s).</p>
        )}
        <div>
          <Label>Games to drop</Label>
          <div className="mt-1 flex items-center gap-2">
            <Button
              type="button"
              variant="lightbackground"
              onClick={() =>
                updateMethodConfig({
                  dylg_drop_count: Math.max(1, (scoring.dylg_drop_count || 1) - 1),
                })
              }
              disabled={(scoring.dylg_drop_count || 1) <= 1}
            >
              −
            </Button>
            <span className="min-w-[1.5rem] text-center text-sm tabular-nums">
              {scoring.dylg_drop_count || 1}
            </span>
            <Button
              type="button"
              variant="lightbackground"
              onClick={() =>
                updateMethodConfig({
                  dylg_drop_count: Math.min(dylgMaxDrop, (scoring.dylg_drop_count || 1) + 1),
                })
              }
              disabled={(scoring.dylg_drop_count || 1) >= dylgMaxDrop}
            >
              +
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default DylgRoundConfigSection;
