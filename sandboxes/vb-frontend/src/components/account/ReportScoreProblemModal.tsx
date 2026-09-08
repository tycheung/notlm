import React, { useState } from 'react';
import { AbuseReportsAPI } from '../../api/abuseReports';
import { getErrorMessage } from '../../api/apiErrors';
import Alert from '../common/Alert';
import Button from '../common/Button';
import Modal from '../common/Modal';

export type ReportScoreProblemTarget = {
  eventId: number;
  eventName: string;
  tournamentName?: string | null;
};

type ReportScoreProblemModalProps = {
  isOpen: boolean;
  target: ReportScoreProblemTarget | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

const ReportScoreProblemModal: React.FC<ReportScoreProblemModalProps> = ({
  isOpen,
  target,
  onClose,
  onSubmitted,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (submitting) return;
    setReason('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setError(null);
    if (reason.trim().length < 3) {
      setError('Please describe the issue (at least a few words).');
      return;
    }
    setSubmitting(true);
    try {
      await AbuseReportsAPI.createReport({
        event_id: target.eventId,
        reason: reason.trim(),
      });
      setReason('');
      onSubmitted?.();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to submit report. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && Boolean(target)}
      onClose={handleClose}
      title="Report a score problem"
      size="small"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 rounded-md text-sm bg-surface-light text-primary border border-border hover:bg-surface transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <Button type="submit" form="report-score-problem-form" disabled={submitting || !target}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </Button>
        </div>
      }
    >
      {target ? (
        <form id="report-score-problem-form" onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-text-muted">
            Tell us what looks wrong. This goes to Victory review — it is for intentionally
            inaccurate scores, not a scoring dispute with the tournament director.
          </p>
          <div>
            <p className="text-sm font-medium text-text">{target.eventName}</p>
            {target.tournamentName ? (
              <p className="text-xs text-text-muted">{target.tournamentName}</p>
            ) : null}
          </div>
          {error ? (
            <Alert variant="error" message={error} onDismiss={() => setError(null)} />
          ) : null}
          <div>
            <label htmlFor="score-problem-reason" className="block text-sm font-medium text-text mb-1">
              Description
            </label>
            <textarea
              id="score-problem-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="block w-full px-3 py-2 bg-surface-light text-text border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="Describe the problem…"
            />
          </div>
        </form>
      ) : null}
    </Modal>
  );
};

export default ReportScoreProblemModal;
