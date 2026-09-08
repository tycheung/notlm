import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../common/Card';
import SectionTitle from '../common/SectionTitle';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { EventRead, EventRegistrationSettingsUpdate } from '../../types/event';
import { getErrorMessage } from '../../api/apiErrors';
import { EventsAPI } from '../../api/events';
import { formatDateTimeNaive } from '../../utils/dateUtils';
import { fromDatetimeLocalToIso, toDatetimeLocalValue } from '../../utils/eventSignupAvailability';

interface EventTdRegistrationSettingsCardProps {
  eventId: number;
  event: EventRead;
  hidePublicVisibility?: boolean;
}

const EventTdRegistrationSettingsCard: React.FC<EventTdRegistrationSettingsCardProps> = ({
  eventId,
  event,
  hidePublicVisibility = false,
}) => {
  const queryClient = useQueryClient();
  const [scheduleLocal, setScheduleLocal] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setScheduleLocal(toDatetimeLocalValue(event.signup_scheduled_open_at));
  }, [event.signup_scheduled_open_at]);

  const mutation = useMutation({
    mutationFn: (body: EventRegistrationSettingsUpdate) =>
      EventsAPI.patchEventRegistrationSettings(eventId, body),
    onSuccess: () => {
      setFeedback(null);
      queryClient.invalidateQueries({ queryKey: ['eventComplete', eventId] });
    },
    onError: (err: unknown) => {
      setFeedback(getErrorMessage(err, 'Could not update settings.'));
    }
  });

  const published = !!event.published_at;
  const manualClosed = event.signups_manually_closed ?? true;

  return (
    <Card>
      <SectionTitle size="small" className="mb-3">
        Visibility &amp; sign-ups
      </SectionTitle>

      {feedback && (
        <Alert variant="error" message={feedback} onDismiss={() => setFeedback(null)} className="mb-3" />
      )}

      <div className="space-y-4 text-sm text-text">
        {hidePublicVisibility ? (
          <div>
            <p className="text-text-muted mb-2 font-medium">Public visibility</p>
            <p className="text-text-muted text-xs">
              Side action only events are not publicly listed. Approved participants
              can still open this event and view side actions. Upgrade to a full
              tournament to make it public.
            </p>
          </div>
        ) : (
          <div>
          <p className="text-text-muted mb-2 font-medium">Public visibility</p>
          <p className="text-text-muted text-xs mb-2">
            Until this event is public, only you and people you gave event access can open
            it. Making it public lets bowlers find the tournament (once any event is public)
            and lets anyone open this event&apos;s page and live results. It does not open
            sign-ups — use the controls below. Making it private hides it from bowlers;
            completed results stay on your desk.
          </p>
          {published ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-text">
                Public since {event.published_at ? formatDateTimeNaive(event.published_at) : '—'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="small"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ unpublish: true })}
              >
                Make private
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="darkbackground"
              size="small"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ publish: true })}
            >
              Make public
            </Button>
          )}
          {event.completed_at ? (
            <p className="text-text-muted text-xs mt-2">
              Completed on {formatDateTimeNaive(event.completed_at)}
            </p>
          ) : null}
          </div>
        )}

        <div className="border-t border-border pt-3">
          <p className="text-text-muted mb-2 font-medium">Event format sharing</p>
          <p className="text-text-muted text-xs mb-2">
            By default this event format is shareable. When hidden, only the owner TD can save
            this event format to their library from the event page.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!event.hide_event_format_sharing}
              onChange={(e) =>
                mutation.mutate({ hide_event_format_sharing: e.target.checked })
              }
              disabled={mutation.isPending}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Hide event format sharing</span>
          </label>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-text-muted mb-2 font-medium">Sign-ups</p>
          <p className="text-text-muted text-xs mb-3">
            Open or close sign-ups anytime. Optional: schedule when sign-ups open (you still close them
            manually later).
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              type="button"
              variant="outline"
              size="small"
              disabled={mutation.isPending || !manualClosed}
              onClick={() => mutation.mutate({ signups_manually_closed: false })}
            >
              Open sign-ups
            </Button>
            <Button
              type="button"
              variant="outline"
              size="small"
              disabled={mutation.isPending || manualClosed}
              onClick={() => mutation.mutate({ signups_manually_closed: true })}
            >
              Close sign-ups
            </Button>
          </div>
          <p className="text-xs text-text-muted mb-1">Scheduled sign-up open (optional)</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <input
              type="datetime-local"
              value={scheduleLocal}
              onChange={(e) => setScheduleLocal(e.target.value)}
              className="bg-surface border border-border rounded-input px-3 py-2 text-text text-sm min-w-0 flex-1 max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="lightbackground"
                size="small"
                disabled={mutation.isPending || !scheduleLocal}
                onClick={() =>
                  mutation.mutate({
                    signup_scheduled_open_at: fromDatetimeLocalToIso(scheduleLocal)
                  })
                }
              >
                Save schedule
              </Button>
              <Button
                type="button"
                variant="lightbackground"
                size="small"
                disabled={mutation.isPending || !event.signup_scheduled_open_at}
                onClick={() => {
                  setScheduleLocal('');
                  mutation.mutate({ signup_scheduled_open_at: null });
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EventTdRegistrationSettingsCard;
