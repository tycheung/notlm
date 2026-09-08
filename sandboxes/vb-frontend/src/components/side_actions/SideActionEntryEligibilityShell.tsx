import React from 'react';
import EntryUnitConfigSection, { SideActionEntryUnit } from './EntryUnitConfigSection';
import EligibilityConfigSection from './EligibilityConfigSection';
import type { AgeClasses, GenderDivisions } from './eligibilityConfig';

interface SideActionEntryEligibilityShellProps {
  divisions: GenderDivisions;
  ageClasses: AgeClasses;
  onDivisionsChange: (next: GenderDivisions) => void;
  onAgeClassesChange: (next: AgeClasses) => void;
  allowTeamEntry?: boolean;
  entryUnit?: SideActionEntryUnit;
  onEntryUnitChange?: (unit: SideActionEntryUnit) => void;
}

const SideActionEntryEligibilityShell: React.FC<SideActionEntryEligibilityShellProps> = ({
  divisions,
  ageClasses,
  onDivisionsChange,
  onAgeClassesChange,
  allowTeamEntry = true,
  entryUnit,
  onEntryUnitChange,
}) => (
  <>
    {entryUnit != null && onEntryUnitChange ? (
      <EntryUnitConfigSection
        entryUnit={entryUnit}
        onChange={onEntryUnitChange}
        allowTeam={allowTeamEntry}
      />
    ) : null}
    <EligibilityConfigSection
      divisions={divisions}
      ageClasses={ageClasses}
      onDivisionsChange={onDivisionsChange}
      onAgeClassesChange={onAgeClassesChange}
      teamPot={entryUnit === 'team'}
    />
  </>
);

export default SideActionEntryEligibilityShell;
