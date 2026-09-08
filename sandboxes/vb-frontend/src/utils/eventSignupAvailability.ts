import { EventComplete } from '../types/event';
import { TournamentRead } from '../types/tournament';
import { parseNaiveDateTimeToDate, toTimezoneNaiveISOString } from './dateUtils';

const parseNaiveOrEpoch = (value: string | null | undefined): Date => {
  const parsed = parseNaiveDateTimeToDate(value);
  return parsed ?? new Date(0);
};

/** Mirrors backend `event_allows_signup_now` (deadlines / before event start). */
export function legacyEventAllowsSignupNow(
  event: EventComplete,
  tournament: TournamentRead,
  now: Date
): boolean {
  if (!event.is_active) return false;
  if (tournament.registration_deadline && parseNaiveOrEpoch(tournament.registration_deadline) < now) {
    return false;
  }
  const deadline = event.registration_deadline || event.end_date;
  if (deadline && now >= parseNaiveOrEpoch(deadline)) return false;
  if (now > parseNaiveOrEpoch(event.start_date)) return false;
  return true;
}

/**
 * All TD sign-up gates except `signups_manually_closed` (mirrors backend
 * `effective_signups_allowed` without the manual flag).
 */
export function signupGatesAllowIfManualOpen(
  event: EventComplete,
  tournament: TournamentRead,
  now: Date
): boolean {
  if (!event.published_at) return false;
  if (!event.is_active) return false;
  if (!legacyEventAllowsSignupNow(event, tournament, now)) return false;
  const sched = event.signup_scheduled_open_at;
  if (sched && now < parseNaiveOrEpoch(sched)) return false;
  return true;
}

export function effectiveSignupsAllowed(
  event: EventComplete,
  tournament: TournamentRead,
  now: Date
): boolean {
  const manualClosed = event.signups_manually_closed ?? true;
  if (manualClosed) return false;
  return signupGatesAllowIfManualOpen(event, tournament, now);
}

export type SignupCtaVisualState =
  | 'open'
  | 'scheduled'
  | 'closed_by_td'
  | 'not_open'
  | 'event_ended'
  | 'tournament_reg_closed'
  | 'legacy_blocked';

/** Countdown to scheduled open: manual open is off, schedule is set and still in the future. */
export function isWaitingForScheduledOpen(
  event: EventComplete,
  tournament: TournamentRead,
  now: Date
): boolean {
  if (!event.published_at || !event.is_active) return false;
  if (!legacyEventAllowsSignupNow(event, tournament, now)) return false;
  if (event.signups_manually_closed ?? true) return false;
  const sched = event.signup_scheduled_open_at;
  if (!sched) return false;
  return now < parseNaiveOrEpoch(sched);
}

export function getSignupCtaVisualState(
  event: EventComplete,
  tournament: TournamentRead,
  now: Date
): SignupCtaVisualState {
  if (parseNaiveOrEpoch(event.end_date) < now) return 'event_ended';
  if (tournament.registration_deadline && parseNaiveOrEpoch(tournament.registration_deadline) < now) {
    return 'tournament_reg_closed';
  }
  if (!event.published_at) return 'not_open';
  if (effectiveSignupsAllowed(event, tournament, now)) return 'open';
  if (isWaitingForScheduledOpen(event, tournament, now)) return 'scheduled';

  const manualClosed = event.signups_manually_closed ?? true;
  if (manualClosed && legacyEventAllowsSignupNow(event, tournament, now)) {
    return 'closed_by_td';
  }

  if (!legacyEventAllowsSignupNow(event, tournament, now)) {
    return 'legacy_blocked';
  }

  return 'not_open';
}

export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return '0:00';
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseNaiveDateTimeToDate(iso);
  if (!d || Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalToIso(local: string): string {
  const parsed = parseNaiveDateTimeToDate(local);
  return parsed ? toTimezoneNaiveISOString(parsed) : '';
}
