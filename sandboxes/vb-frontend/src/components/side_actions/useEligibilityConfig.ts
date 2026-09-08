import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { AgeClasses, EligibilityFields, GenderDivisions } from './eligibilityConfig';
import { eligibilityPatch } from './eligibilityConfig';

/**
 * Shared divisions / age-class state for side-action config forms.
 * Thresholds stay from the initial parse (no editable age UI).
 */
export function useEligibilityConfig(initialEligibility: EligibilityFields): {
  divisions: GenderDivisions;
  ageClasses: AgeClasses;
  setDivisions: Dispatch<SetStateAction<GenderDivisions>>;
  setAgeClasses: Dispatch<SetStateAction<AgeClasses>>;
  eligibilityFields: EligibilityFields;
} {
  const [divisions, setDivisions] = useState(initialEligibility.divisions);
  const [ageClasses, setAgeClasses] = useState(initialEligibility.age_classes);

  const eligibilityFields = useMemo(
    () =>
      eligibilityPatch({
        divisions,
        age_classes: ageClasses,
        youth_max_age: initialEligibility.youth_max_age,
        senior_min_age: initialEligibility.senior_min_age,
      }),
    [
      divisions,
      ageClasses,
      initialEligibility.youth_max_age,
      initialEligibility.senior_min_age,
    ]
  );

  return {
    divisions,
    ageClasses,
    setDivisions,
    setAgeClasses,
    eligibilityFields,
  };
}
