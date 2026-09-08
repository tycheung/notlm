import React from 'react';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatDateNaive } from '../../utils/dateUtils';

interface YouthEligibilityReviewFlagProps {
  /** Server-computed on team events when profile age is 21 or under at event start. */
  show?: boolean;
  birthDate?: string | null;
  asOfDate?: string | null;
}

function ageFromBirthDate(
  birthDate: string | null | undefined,
  asOfDate?: string | null
): number | null {
  const birthMatch = String(birthDate || '')
    .trim()
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!birthMatch) return null;
  const birth = {
    year: Number(birthMatch[1]),
    month: Number(birthMatch[2]),
    day: Number(birthMatch[3]),
  };
  const asOfMatch = String(asOfDate || '')
    .trim()
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const asOf = asOfMatch
    ? {
        year: Number(asOfMatch[1]),
        month: Number(asOfMatch[2]),
        day: Number(asOfMatch[3]),
      }
    : (() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
      })();
  let years = asOf.year - birth.year;
  if (asOf.month < birth.month || (asOf.month === birth.month && asOf.day < birth.day)) {
    years -= 1;
  }
  return years;
}

/** Team-event roster hint: profile age 21 or under — TD reviews Youth; not auto-checked. */
const YouthEligibilityReviewFlag: React.FC<YouthEligibilityReviewFlagProps> = ({
  show,
  birthDate,
  asOfDate,
}) => {
  if (!show) return null;
  const iso = String(birthDate || '').slice(0, 10);
  const age = ageFromBirthDate(birthDate, asOfDate);
  const dobLabel = iso ? formatDateNaive(iso) : '';
  return (
    <div
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
      title="This bowler is 21 or under as of the event start. Review youth eligibility and mark Youth if they should not bowl with adults."
    >
      <WarningAmberIcon className="h-3 w-3 shrink-0" />
      <span>
        Review youth eligibility
        {dobLabel ? ` · Born ${dobLabel}` : ''}
        {age != null ? ` (age ${age})` : ''}
      </span>
    </div>
  );
};

export default YouthEligibilityReviewFlag;
