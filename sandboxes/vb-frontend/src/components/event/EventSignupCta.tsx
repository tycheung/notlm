import React, { useEffect, useState } from 'react';
import { EventFormat, EventComplete } from '../../types/event';
import { TournamentRead } from '../../types/tournament';
import Button from '../common/Button';
import {
  effectiveSignupsAllowed,
  formatCountdown,
  getSignupCtaVisualState,
  isWaitingForScheduledOpen
} from '../../utils/eventSignupAvailability';
import { formatDateTimeNaive, parseNaiveDateTimeToDate } from '../../utils/dateUtils';

interface EventSignupCtaProps {
  eventComplete: EventComplete;
  tournament: TournamentRead;
  eventFormat: EventFormat;
  user: { id: number } | null;
  singlesPending: boolean;
  onSinglesClick: () => void;
  onTeamsClick: () => void;
}

const stateButtonClass: Record<string, string> = {
  open: '',
  scheduled: 'bg-surface-light border-2 border-accent text-accent',
  closed_by_td: 'bg-surface-light border border-border text-text-muted',
  not_open: 'bg-surface-light border border-border text-text-muted',
  event_ended: 'bg-surface-light border border-border text-text-muted',
  tournament_reg_closed: 'bg-surface-light border border-border text-text-muted',
  legacy_blocked: 'bg-surface-light border border-border text-text-muted'
};

/**
 * Bowler-facing sign-up control: mirrors server rules; disabled unless effectively open.
 */
const EventSignupCta: React.FC<EventSignupCtaProps> = ({
  eventComplete,
  tournament,
  eventFormat,
  user,
  singlesPending,
  onSinglesClick,
  onTeamsClick
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const visual = getSignupCtaVisualState(eventComplete, tournament, now);
  const canSubmit = effectiveSignupsAllowed(eventComplete, tournament, now);

  const sched = eventComplete.signup_scheduled_open_at
    ? parseNaiveDateTimeToDate(eventComplete.signup_scheduled_open_at)
    : null;
  const remainingMs = sched ? sched.getTime() - now.getTime() : 0;
  const waitingSched = isWaitingForScheduledOpen(eventComplete, tournament, now);

  const urgency =
    waitingSched && remainingMs > 0 && remainingMs <= 5 * 60 * 1000;

  const opensAtLabel = eventComplete.signup_scheduled_open_at
    ? formatDateTimeNaive(eventComplete.signup_scheduled_open_at)
    : '';

  let label: string;
  switch (visual) {
    case 'open':
      label = 'Sign up';
      break;
    case 'scheduled':
      label = `Opens in ${formatCountdown(remainingMs)}`;
      break;
    case 'closed_by_td':
      label = 'Closed';
      break;
    case 'not_open':
      label = 'Sign-ups not open';
      break;
    case 'event_ended':
      label = 'Event ended';
      break;
    case 'tournament_reg_closed':
      label = 'Sign-up closed';
      break;
    default:
      label = 'Sign-ups not open';
  }

  const extraClass =
    visual === 'open'
      ? ''
      : stateButtonClass[visual] || stateButtonClass.not_open;

  const isSingles = eventFormat === EventFormat.SINGLES;

  const scheduleHint =
    visual === 'scheduled' ? (
      <p
        className={`text-xs sm:text-sm text-right ${
          urgency ? 'font-semibold text-pending' : 'text-text-muted'
        }`}
      >
        Sign-ups open at {opensAtLabel}
      </p>
    ) : null;

  if (user) {
    return (
      <div className="flex flex-col items-end gap-1 max-w-xs sm:max-w-none sm:items-end">
        {scheduleHint}
        <Button
          variant="darkbackground"
          onClick={isSingles ? onSinglesClick : onTeamsClick}
          disabled={!canSubmit || singlesPending}
          isLoading={isSingles ? singlesPending : false}
          className={`shrink-0 ${extraClass} ${
            urgency && visual === 'scheduled' ? 'ring-2 ring-pending/80' : ''
          }`}
          aria-disabled={!canSubmit}
        >
          {isSingles && singlesPending ? 'Submitting…' : label}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 max-w-xs sm:max-w-none sm:items-end">
      {scheduleHint}
      <Button
        variant="darkbackground"
        onClick={isSingles ? onSinglesClick : onTeamsClick}
        disabled={!canSubmit}
        className={`shrink-0 ${extraClass} ${urgency && visual === 'scheduled' ? 'ring-2 ring-pending/80' : ''}`}
        aria-disabled={!canSubmit}
      >
        {label}
      </Button>
    </div>
  );
};

export default EventSignupCta;
