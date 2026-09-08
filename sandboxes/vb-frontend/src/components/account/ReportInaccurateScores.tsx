import React, { useEffect, useState } from 'react';
import {
  AbuseReportableEvent,
  AbuseReportsAPI,
} from '../../api/abuseReports';
import Alert from '../common/Alert';
import Button from '../common/Button';
import Select from '../common/Select';

/**
 * Bowler-facing form to report intentionally inaccurate scores for an event
 * they participated in.
 */
const ReportInaccurateScores: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<AbuseReportableEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventId, setEventId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoadingEvents(true);
      setError(null);
      try {
        const data = await AbuseReportsAPI.listReportableEvents();
        if (!cancelled) {
          setEvents(data);
          if (data.length === 1) {
            setEventId(String(data[0].event_id));
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Could not load your events. Please try again.');
        }
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!eventId) {
      setError('Select an event.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Please describe the issue (at least a few words).');
      return;
    }
    setSubmitting(true);
    try {
      await AbuseReportsAPI.createReport({
        event_id: Number(eventId),
        reason: reason.trim(),
      });
      setSuccess(
        'Report submitted. Our team will review it. Thank you for helping keep scores accurate.'
      );
      setReason('');
      setEventId('');
      setOpen(false);
    } catch (err: unknown) {
      console.error(err);
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Failed to submit report. Please try again.';
      setError(typeof message === 'string' ? message : 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const eventOptions = events.map((ev) => ({
    value: String(ev.event_id),
    label: ev.tournament_name
      ? `${ev.tournament_name} — ${ev.event_name}`
      : ev.event_name,
  }));

  return (
    <div className="bg-surface rounded-lg overflow-hidden shadow mt-6">
      <div className="p-6">
        <h2 className="text-xl font-bold text-primary mb-2">
          Report inaccurate scores
        </h2>
        <p className="text-sm text-text-muted mb-4">
          If scores from an event you bowled in look intentionally wrong, report
          it here. Choose the event and briefly explain what you noticed.
        </p>

        {success && (
          <Alert
            variant="success"
            message={success}
            onDismiss={() => setSuccess(null)}
            className="mb-4"
          />
        )}
        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}

        {!open ? (
          <Button type="button" onClick={() => setOpen(true)}>
            File a report
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Event
              </label>
              {loadingEvents ? (
                <p className="text-sm text-text-muted">Loading your events…</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No approved event participations found to report on.
                </p>
              ) : (
                <Select
                  value={eventId}
                  onChange={setEventId}
                  options={eventOptions}
                  placeholder="Select an event"
                />
              )}
            </div>
            <div>
              <label
                htmlFor="abuse_reason"
                className="block text-sm font-medium text-text mb-1"
              >
                What looks wrong?
              </label>
              <textarea
                id="abuse_reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 bg-surface-light text-text border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="Example: Game 3 for lane 12 was entered as 300 but the bowler only had a 180…"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="px-4 py-2 rounded-md text-sm bg-surface-light text-primary border border-border hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={submitting || events.length === 0}
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportInaccurateScores;
