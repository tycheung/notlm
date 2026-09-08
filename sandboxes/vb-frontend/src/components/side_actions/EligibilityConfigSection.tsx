import React from 'react';
import Label from '../common/Label';
import type { AgeClasses, GenderDivisions } from './eligibilityConfig';

interface EligibilityConfigSectionProps {
  divisions: GenderDivisions;
  ageClasses: AgeClasses;
  onDivisionsChange: (next: GenderDivisions) => void;
  onAgeClassesChange: (next: AgeClasses) => void;
  /** Team pots require every rostered teammate to match. */
  teamPot?: boolean;
  /** Love Doubles always includes both genders. */
  hideGender?: boolean;
  genderNote?: string;
}

function hasAnyGroup(divisions: GenderDivisions, ages: AgeClasses): boolean {
  return Boolean(
    divisions.men ||
      divisions.women ||
      ages.youth ||
      ages.open ||
      ages.senior
  );
}

const EligibilityConfigSection: React.FC<EligibilityConfigSectionProps> = ({
  divisions,
  ageClasses,
  onDivisionsChange,
  onAgeClassesChange,
  teamPot = false,
  hideGender = false,
  genderNote,
}) => {
  const toggleGender = (key: keyof GenderDivisions) => {
    const next = { ...divisions, [key]: !divisions[key] };
    if (!hasAnyGroup(next, ageClasses)) return;
    onDivisionsChange(next);
  };

  const toggleAge = (key: keyof AgeClasses) => {
    const next = { ...ageClasses, [key]: !ageClasses[key] };
    if (!hasAnyGroup(divisions, next)) return;
    onAgeClassesChange(next);
  };

  return (
    <div className="rounded-md border border-border bg-surface-light p-4 space-y-4">
      <div>
        <Label>Who can enter this pot?</Label>
        <p className="mt-1 text-xs text-text-muted">
          Checked groups can enter (OR). Women + Senior lets in any woman and any
          senior — including male seniors and women who are not seniors. Youth must
          be marked on the participants list; Senior is a roster toggle (on by
          default when the bowler account is 50+).
          {teamPot
            ? ' For a team pot, every rostered teammate must match at least one checked group.'
            : null}
        </p>
      </div>

      {!hideGender && (
      <div>
        <p className="text-sm font-medium text-text">Gender</p>
        <p className="text-xs text-text-muted mt-0.5 mb-2">
          Uncheck both when the pot is youth-only, senior-only, or open-adults-only.
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center text-sm text-text">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={divisions.men === true}
              onChange={() => toggleGender('men')}
            />
            Men
          </label>
          <label className="flex items-center text-sm text-text">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={divisions.women === true}
              onChange={() => toggleGender('women')}
            />
            Women
          </label>
        </div>
      </div>
      )}
      {hideGender && genderNote && (
        <p className="text-xs text-text-muted">{genderNote}</p>
      )}

      <div>
        <p className="text-sm font-medium text-text">Class</p>
        <p className="text-xs text-text-muted mt-0.5 mb-2">
          Open adults = not marked Youth and not marked Senior on the roster. Leave
          all class boxes checked (with both genders) for an open pot.
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center text-sm text-text">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={ageClasses.youth === true}
              onChange={() => toggleAge('youth')}
            />
            Youth
          </label>
          <label className="flex items-center text-sm text-text">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={ageClasses.open === true}
              onChange={() => toggleAge('open')}
            />
            Open adults
          </label>
          <label className="flex items-center text-sm text-text">
            <input
              type="checkbox"
              className="mr-1.5"
              checked={ageClasses.senior === true}
              onChange={() => toggleAge('senior')}
            />
            Senior
          </label>
        </div>
      </div>
    </div>
  );
};

export default EligibilityConfigSection;
