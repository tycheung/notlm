export const DEFAULT_DIVISIONS = { men: true, women: true };
export const DEFAULT_AGE_CLASSES = { youth: true, open: true, senior: true };
export const DEFAULT_YOUTH_MAX_AGE = 17;
export const DEFAULT_SENIOR_MIN_AGE = 50;

export type GenderDivisions = { men: boolean; women: boolean };
export type AgeClasses = { youth: boolean; open: boolean; senior: boolean };

export interface EligibilityFields {
  divisions: GenderDivisions;
  age_classes: AgeClasses;
  youth_max_age: number;
  senior_min_age: number;
}

function clampYouthMax(value: number): number {
  return Math.max(0, Math.min(25, Math.round(value)));
}

function clampSeniorMin(value: number, youthMax: number): number {
  return Math.max(youthMax + 1, Math.min(80, Math.round(value)));
}

export function parseGenderDivisions(raw: unknown): GenderDivisions {
  if (Array.isArray(raw)) {
    const names = raw.map((name) => String(name).trim().toLowerCase());
    const men = names.some((name) => ['men', "men's", 'mens', 'male'].includes(name));
    const women = names.some((name) =>
      ['women', "women's", 'womens', 'female', 'ladies', 'lady'].includes(name)
    );
    return men || women ? { men, women } : { ...DEFAULT_DIVISIONS };
  }
  if (raw && typeof raw === 'object') {
    const divisions = raw as { men?: boolean; women?: boolean };
    return {
      men: divisions.men === true || divisions.men === undefined,
      women: divisions.women === true || divisions.women === undefined,
    };
  }
  return { ...DEFAULT_DIVISIONS };
}

export function parseAgeClasses(raw: unknown): AgeClasses {
  if (raw && typeof raw === 'object') {
    const ages = raw as { youth?: boolean; open?: boolean; senior?: boolean };
    if ('youth' in ages || 'open' in ages || 'senior' in ages) {
      const youth = Boolean(ages.youth);
      const open = Boolean(ages.open);
      const senior = Boolean(ages.senior);
      if (!youth && !open && !senior) return { ...DEFAULT_AGE_CLASSES };
      return { youth, open, senior };
    }
  }
  return { ...DEFAULT_AGE_CLASSES };
}

export function parseYouthMaxAge(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_YOUTH_MAX_AGE;
  return clampYouthMax(n);
}

export function parseSeniorMinAge(raw: unknown, youthMax: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return clampSeniorMin(DEFAULT_SENIOR_MIN_AGE, youthMax);
  }
  return clampSeniorMin(n, youthMax);
}

export function eligibilityFromConfig(config: {
  divisions?: unknown;
  age_classes?: unknown;
  youth_max_age?: unknown;
  senior_min_age?: unknown;
}): EligibilityFields {
  const youthMax = parseYouthMaxAge(config.youth_max_age);
  return {
    divisions: parseGenderDivisions(config.divisions),
    age_classes: parseAgeClasses(config.age_classes),
    youth_max_age: youthMax,
    senior_min_age: parseSeniorMinAge(config.senior_min_age, youthMax),
  };
}

export function eligibilityPatch(fields: EligibilityFields): EligibilityFields {
  const youthMax = clampYouthMax(fields.youth_max_age);
  return {
    divisions: {
      men: fields.divisions.men !== false,
      women: fields.divisions.women !== false,
    },
    age_classes: {
      youth: fields.age_classes.youth !== false,
      open: fields.age_classes.open !== false,
      senior: fields.age_classes.senior !== false,
    },
    youth_max_age: youthMax,
    senior_min_age: clampSeniorMin(fields.senior_min_age, youthMax),
  };
}
