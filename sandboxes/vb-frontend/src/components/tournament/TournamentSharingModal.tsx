import React, { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import Loading from '../common/Loading';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';
import { formatDateTimeNaive } from '../../utils/dateUtils';
import { normalizeRoundStatus } from '../../utils/statusUtils';
import {
  tournamentPublicLandingUrl,
  tournamentPublicStandingsUrl,
} from '../../utils/appUrl';
import { buildStandingsQrPosterDocument } from '../event-reports/buildStandingsQrPosterDocument';
import SideActionReportPreviewModal from '../side_actions/reports/SideActionReportPreviewModal';
import type { ReportDocument } from '../../utils/sideActionReportPrint';

interface TournamentSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: number;
  tournamentName: string;
  centerName?: string | null;
  dateLabel?: string | null;
}

function allRoundsComplete(
  rounds: Array<{ status?: string | null }> | undefined
): boolean {
  if (!rounds?.length) return false;
  return rounds.every((r) => normalizeRoundStatus(r.status) === 'completed');
}

/**
 * Tournament share + make public / private / complete controls (TD).
 * Public access is always /tournaments/{id}.
 */
const TournamentSharingModal: React.FC<TournamentSharingModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentName,
  centerName,
  dateLabel,
}) => {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<'overview' | 'live' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [posterDoc, setPosterDoc] = useState<ReportDocument | null>(null);

  const overviewUrl = useMemo(
    () => tournamentPublicLandingUrl(tournamentId),
    [tournamentId]
  );
  const liveUrl = useMemo(
    () => tournamentPublicStandingsUrl(tournamentId),
    [tournamentId]
  );

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['tournamentEvents', tournamentId],
    queryFn: () => EventsAPI.getTournamentEvents(tournamentId),
    enabled: isOpen && tournamentId > 0,
  });

  const roundQueries = useQueries({
    queries: events.map((ev) => ({
      queryKey: ['eventWithRounds', ev.id],
      queryFn: () => EventsAPI.getEventWithRounds(ev.id),
      enabled: isOpen && events.length > 0,
      staleTime: 15_000,
    })),
  });

  const settingsMutation = useMutation({
    mutationFn: ({
      eventId,
      body,
    }: {
      eventId: number;
      body: Parameters<typeof EventsAPI.patchEventRegistrationSettings>[1];
    }) => EventsAPI.patchEventRegistrationSettings(eventId, body),
    onSuccess: async (_data, vars) => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['tournamentEvents', tournamentId] });
      await queryClient.invalidateQueries({ queryKey: ['eventComplete', vars.eventId] });
      await queryClient.invalidateQueries({ queryKey: ['eventWithRounds', vars.eventId] });
    },
    onError: (err: unknown) => {
      setActionError(getErrorMessage(err, 'Could not update event visibility.'));
    },
  });

  const copy = async (kind: 'overview' | 'live', url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Share & visibility" size="large">
      <div className="space-y-6">
        <p className="text-sm text-text-muted">
          Public links use this tournament URL. Live results open the Live tab. An event
          stays findable forever while it is public — make it private anytime. Bowlers see
          the tournament in search once at least one event is public. Sign-ups are a
          separate control on the event.
        </p>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-primary">Tournament link</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              readOnly
              fullWidth
              value={overviewUrl}
              className="font-mono text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              type="button"
              variant="darkbackground"
              className="shrink-0"
              onClick={() => copy('overview', overviewUrl)}
            >
              {copied === 'overview' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <label className="block text-sm font-medium text-primary">Live results link</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              readOnly
              fullWidth
              value={liveUrl}
              className="font-mono text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              type="button"
              variant="darkbackground"
              className="shrink-0"
              onClick={() => copy('live', liveUrl)}
            >
              {copied === 'live' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="flex justify-center pt-2 border-t border-border-muted">
            <div className="bg-surface-light p-3 rounded-lg inline-block border border-border">
              <QRCodeSVG value={liveUrl} size={160} level="M" includeMargin />
            </div>
          </div>
          <p className="text-center text-xs text-text-muted">
            Scan for {tournamentName} live board
          </p>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() =>
              setPosterDoc(
                buildStandingsQrPosterDocument({
                  tournamentName,
                  centerName,
                  dateLabel,
                  standingsUrl: liveUrl,
                })
              )
            }
          >
            Print standings poster
          </Button>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Events — public / complete</h3>
          {actionError && (
            <Alert variant="error" message={actionError} onDismiss={() => setActionError(null)} />
          )}
          {eventsLoading && <Loading />}
          {!eventsLoading && events.length === 0 && (
            <p className="text-sm text-text-muted">No events yet.</p>
          )}
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {events.map((ev, index) => {
              const withRounds = roundQueries[index]?.data;
              const roundsDone = allRoundsComplete(withRounds?.rounds);
              const published = Boolean(ev.published_at);
              const completed = Boolean(ev.completed_at);
              const busy = settingsMutation.isPending;
              return (
                <li
                  key={ev.id}
                  className="px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-surface"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{ev.name}</p>
                    <p className="text-xs text-text-muted">
                      {published
                        ? `Public${ev.published_at ? ` · ${formatDateTimeNaive(ev.published_at)}` : ''}`
                        : 'Private'}
                      {completed
                        ? ` · Completed${ev.completed_at ? ` ${formatDateTimeNaive(ev.completed_at)}` : ''}`
                        : roundsDone
                          ? ' · All rounds done — ready to complete'
                          : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {published ? (
                      <Button
                        type="button"
                        size="small"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          settingsMutation.mutate({ eventId: ev.id, body: { unpublish: true } })
                        }
                      >
                        Make private
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="small"
                        variant="darkbackground"
                        disabled={busy}
                        onClick={() =>
                          settingsMutation.mutate({ eventId: ev.id, body: { publish: true } })
                        }
                      >
                        Make public
                      </Button>
                    )}
                    {!completed && roundsDone && (
                      <Button
                        type="button"
                        size="small"
                        variant="primary"
                        disabled={busy}
                        onClick={() =>
                          settingsMutation.mutate({ eventId: ev.id, body: { complete: true } })
                        }
                      >
                        Complete event
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Modal>
    <SideActionReportPreviewModal
      isOpen={posterDoc != null}
      document={posterDoc}
      onClose={() => setPosterDoc(null)}
    />
    </>
  );
};

export default TournamentSharingModal;
