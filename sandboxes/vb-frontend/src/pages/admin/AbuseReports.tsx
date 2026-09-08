import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AbuseReport,
  AbuseReportStatus,
  AbuseReportsAPI,
} from '../../api/abuseReports';
import Alert from '../../components/common/Alert';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import PageTitle from '../../components/common/PageTitle';
import Select from '../../components/common/Select';
import { formatDateTimeNaive } from '../../utils/dateUtils';
import { homeCrumb, layoutDashboardCrumb } from '../../utils/breadcrumbBuilders';
import {
  adminBowlerPath,
  adminEventScoringPath,
  adminEventStandingsPath,
  adminTournamentLivePath,
  adminTournamentPath,
  eventCompletedLabel,
  scoresPostedLabel,
  snapshotFromReport,
} from './abuseReportReview';

const QUEUE_PAGE_SIZE = 100;

const STATUS_OPTIONS = [
  { value: 'needs_review', label: 'Needs review (open + in review)' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All statuses' },
];

const STATUS_UPDATE_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const AbuseReportsPage: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('needs_review');
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<AbuseReportStatus>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = reports.find((r) => r.id === selectedId) ?? null;

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AbuseReportsAPI.listAdminReports({
        ...(statusFilter === 'needs_review'
          ? { queue: 'needs_review' as const }
          : statusFilter !== 'all'
            ? { status: statusFilter as AbuseReportStatus }
            : {}),
        limit: QUEUE_PAGE_SIZE,
      });
      setReports(data.items);
      setOpenCount(data.open_count);
      setHasMore(Boolean(data.has_more));
      if (selectedId && !data.items.some((r) => r.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load abuse reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (selected) {
      setEditStatus(selected.status);
      setAdminNotes(selected.admin_notes || '');
      setOutcome(selected.outcome || '');
    }
  }, [selected]);

  const handleSelect = (report: AbuseReport) => {
    setSelectedId(report.id);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await AbuseReportsAPI.updateAdminReport(selected.id, {
        status: editStatus,
        admin_notes: adminNotes.trim() || null,
        outcome: outcome.trim() || null,
      });
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSuccess('Report updated.');
      await fetchReports();
    } catch (err) {
      console.error(err);
      setError('Failed to update report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-6">
      <div className="mx-auto px-4 sm:px-6 md:px-8">
        <Breadcrumb
          items={[
            homeCrumb(),
            layoutDashboardCrumb(location.pathname),
            { label: 'Abuse Reports' },
          ]}
          className="mb-4"
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <PageTitle>Abuse Reports</PageTitle>
          <p className="text-sm text-text-muted">
            {openCount} open / in review
          </p>
        </div>

        {error && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}
        {success && (
          <Alert
            variant="success"
            message={success}
            onDismiss={() => setSuccess(null)}
            className="mb-4"
          />
        )}

        <div className="mb-4 max-w-xs">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Filter"
          />
        </div>

        {hasMore && !loading && (
          <Alert
            variant="info"
            message={`Showing the newest ${QUEUE_PAGE_SIZE} matching reports. Narrow the filter to see the rest.`}
            className="mb-4"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-primary">Queue</h2>
            </div>
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loading />
              </div>
            ) : reports.length === 0 ? (
              <p className="p-6 text-sm text-text-muted">No reports found.</p>
            ) : (
              <ul className="divide-y divide-border max-h-[32rem] overflow-y-auto">
                {reports.map((report) => (
                  <li key={report.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(report)}
                      className={`w-full text-left px-4 py-3 hover:bg-surface-light transition-colors ${
                        selectedId === report.id ? 'bg-surface-light' : ''
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-medium text-text truncate">
                          {report.event_name ||
                            (report.event_id != null
                              ? `Event #${report.event_id}`
                              : 'Unknown event')}
                        </span>
                        <span className="text-xs text-text-muted whitespace-nowrap capitalize">
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 truncate">
                        {report.reporter_name || report.reporter_email} ·{' '}
                        {formatDateTimeNaive(report.created_at)}
                      </p>
                      <p className="text-sm text-text-muted mt-1 line-clamp-2">
                        {report.reason}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="shadow-sm">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-primary">Review</h2>
            </div>
            {!selected ? (
              <p className="p-6 text-sm text-text-muted">
                Select a report to review.
              </p>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">
                    Event
                  </p>
                  <p className="text-sm text-text">
                    {selected.tournament_name
                      ? `${selected.tournament_name} · `
                      : ''}
                    {selected.event_name ||
                      (selected.event_id != null
                        ? `Event #${selected.event_id}`
                        : 'Unknown event')}
                  </p>
                  {selected.snapshot?.source_deleted ? (
                    <p className="text-xs text-text-muted mt-1">
                      Original event was deleted. This report was kept with the
                      names from submit time.
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-1 text-sm">
                      {selected.tournament_id != null && (
                        <Link
                          to={adminTournamentPath(selected.tournament_id)}
                          className="text-primary hover:underline"
                        >
                          Open tournament
                        </Link>
                      )}
                      {selected.tournament_id != null && selected.event_id != null && (
                        <Link
                          to={adminTournamentLivePath(
                            selected.tournament_id,
                            selected.event_id
                          )}
                          className="text-primary hover:underline"
                        >
                          Open live / standings
                        </Link>
                      )}
                      {selected.event_id != null && (
                        <>
                          <Link
                            to={adminEventStandingsPath(selected.event_id)}
                            className="text-primary hover:underline"
                          >
                            Open event standings
                          </Link>
                          <Link
                            to={adminEventScoringPath(selected.event_id)}
                            className="text-primary hover:underline"
                          >
                            Open game scoring
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">
                    Reporter
                  </p>
                  <p className="text-sm text-text">
                    {selected.reporter_name} ({selected.reporter_email})
                  </p>
                  <Link
                    to={adminBowlerPath(selected.reporter_user_id)}
                    className="text-sm text-primary hover:underline mt-1 inline-block"
                  >
                    Open bowler profile
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">
                    At submit
                  </p>
                  <p className="text-sm text-text">
                    {scoresPostedLabel(
                      snapshotFromReport(selected).games_scores_count
                    )}
                  </p>
                  <p className="text-sm text-text-muted mt-1">
                    {eventCompletedLabel(
                      snapshotFromReport(selected).event_completed_at
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide">
                    Reason
                  </p>
                  <p className="text-sm text-text whitespace-pre-wrap">
                    {selected.reason}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-text-muted uppercase tracking-wide mb-1">
                    Status
                  </label>
                  <Select
                    value={editStatus}
                    onChange={(v) => setEditStatus(v as AbuseReportStatus)}
                    options={STATUS_UPDATE_OPTIONS}
                  />
                </div>
                <div>
                  <label
                    htmlFor="triage_outcome"
                    className="block text-xs text-text-muted uppercase tracking-wide mb-1"
                  >
                    Outcome
                  </label>
                  <input
                    id="triage_outcome"
                    type="text"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    maxLength={500}
                    className="block w-full px-3 py-2 bg-surface-light text-text border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Why dismissed, or what you did…"
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin_notes"
                    className="block text-xs text-text-muted uppercase tracking-wide mb-1"
                  >
                    Admin notes
                  </label>
                  <textarea
                    id="admin_notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="block w-full px-3 py-2 bg-surface-light text-text border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Internal notes for triage…"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? 'Saving…' : 'Save review'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AbuseReportsPage;
