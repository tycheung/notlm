import React, { useState } from 'react';
import Button from '../../common/Button';
import type { PodsMembershipPreviewPod } from '../../../utils/podsScoringGroups';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import { buildEventPodsReportDocument } from '../../event-reports/buildEventPodsReportDocument';
import SideActionReportPreviewModal from '../../side_actions/reports/SideActionReportPreviewModal';
import EventPodsViewerModal from './EventPodsViewerModal';
import PodsMembershipPreview from './PodsMembershipPreview';
import type { PodsDeskConfig } from './podsMatchupsUtils';

interface PodsMatchupsPreviewProps {
  podPreview: PodsMembershipPreviewPod[];
  draft: PodsDeskConfig;
  isTeamEvent: boolean;
  unitLabel: string;
  roundDisplayName: string;
  tournamentName?: string | null;
  eventName?: string | null;
  busy?: boolean;
}

const PodsMatchupsPreview: React.FC<PodsMatchupsPreviewProps> = ({
  podPreview,
  draft,
  isTeamEvent,
  unitLabel,
  roundDisplayName,
  tournamentName,
  eventName,
  busy = false,
}) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);

  if (podPreview.length === 0) {
    if (draft.pod_membership?.length) {
      return (
        <p className="text-sm text-text-muted">
          Pod seeds are saved but the locked squad roster is not loaded yet. Refresh or open
          Squads, then return here to see names.
        </p>
      );
    }
    return (
      <p className="text-sm text-text-muted">
        No pod rosters yet. Save settings and generate when the roster (or feeder pool) has at
        least two entrants.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="lightbackground"
          disabled={busy}
          onClick={() => setViewerOpen(true)}
        >
          View pods
        </Button>
        <Button
          type="button"
          variant="lightbackground"
          disabled={busy}
          onClick={() =>
            setPreviewDoc(
              buildEventPodsReportDocument({
                pods: podPreview,
                isTeamEvent,
                podSizeMin: draft.pod_size_min,
                podSizeMax: draft.pod_size_max,
                balanceMode: draft.balance_mode,
                tournamentName,
                eventName,
                roundName: roundDisplayName,
              })
            )
          }
        >
          Print pods
        </Button>
      </div>
      <PodsMembershipPreview pods={podPreview} unitLabel={unitLabel} />
      <EventPodsViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        pods={podPreview}
        isTeamEvent={isTeamEvent}
        unitLabel={unitLabel}
        podSizeMin={draft.pod_size_min}
        podSizeMax={draft.pod_size_max}
        balanceMode={draft.balance_mode}
        roundName={roundDisplayName}
        tournamentName={tournamentName}
        eventName={eventName}
      />
      <SideActionReportPreviewModal
        isOpen={previewDoc != null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </>
  );
};

export default PodsMatchupsPreview;
