import React, { useEffect } from 'react';
import Label from '../common/Label';

export type SideActionEntryUnit = 'bowler' | 'team';

interface EntryUnitConfigSectionProps {
  entryUnit: SideActionEntryUnit;
  onChange: (unit: SideActionEntryUnit) => void;
  /** Team pots require an event with roster teams. Hidden on singles. */
  allowTeam?: boolean;
}

/** Shared Bowler vs Team toggle for side-action pots (High Game, High Series, Brackets, Eliminator). */
const EntryUnitConfigSection: React.FC<EntryUnitConfigSectionProps> = ({
  entryUnit,
  onChange,
  allowTeam = true,
}) => {
  useEffect(() => {
    if (!allowTeam && entryUnit === 'team') {
      onChange('bowler');
    }
  }, [allowTeam, entryUnit, onChange]);

  if (!allowTeam) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface-light p-4">
      <Label>Who enters this pot?</Label>
      <p className="mt-1 text-xs text-text-muted">
        Team pots take one entry per event team. Scores are the sum of that
        team&apos;s members for the games or series this pot uses (for example a
        5-man team high game is five individual scores added together).
      </p>
      <div className="mt-3 space-y-2">
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            className="mt-1"
            checked={entryUnit === 'bowler'}
            onChange={() => onChange('bowler')}
          />
          <span>
            <span className="font-medium">Bowler</span>
            <span className="block text-xs text-text-muted">
              Individual scores; each bowler enters on their own line.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="radio"
            className="mt-1"
            checked={entryUnit === 'team'}
            onChange={() => onChange('team')}
          />
          <span>
            <span className="font-medium">Team</span>
            <span className="block text-xs text-text-muted">
              One seat per team on the team line. Standings list teams.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
};

export default EntryUnitConfigSection;
