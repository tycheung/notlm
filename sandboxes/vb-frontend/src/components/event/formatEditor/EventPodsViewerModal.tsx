import React, { useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import SideActionReportPreviewModal from '../../side_actions/reports/SideActionReportPreviewModal';
import { buildEventPodsReportDocument } from '../../event-reports/buildEventPodsReportDocument';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import type { PodsMembershipPreviewPod } from '../../../utils/podsScoringGroups';
import PodsMembershipPreview from './PodsMembershipPreview';

export interface EventPodsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pods: PodsMembershipPreviewPod[];
  isTeamEvent: boolean;
  unitLabel: string;
  podSizeMin?: number | null;
  podSizeMax?: number | null;
  balanceMode?: string | null;
  roundName?: string;
  tournamentName?: string | null;
  eventName?: string | null;
}

const EventPodsViewerModal: React.FC<EventPodsViewerModalProps> = ({
  isOpen,
  onClose,
  pods,
  isTeamEvent,
  unitLabel,
  podSizeMin,
  podSizeMax,
  balanceMode,
  roundName,
  tournamentName,
  eventName,
}) => {
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);

  const openPrintPreview = () => {
    setPreviewDoc(
      buildEventPodsReportDocument({
        pods,
        isTeamEvent,
        podSizeMin,
        podSizeMax,
        balanceMode,
        tournamentName,
        eventName,
        roundName,
      })
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={roundName ? `Pods — ${roundName}` : 'Pods'}
        size="large"
        closeOnOutsideClick
        contentClassName="min-h-0 flex-1 overflow-auto overscroll-contain px-5 py-5"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="small" variant="lightbackground" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              size="small"
              variant="primary"
              disabled={pods.length === 0}
              onClick={openPrintPreview}
            >
              Print preview
            </Button>
          </div>
        }
      >
        {pods.length === 0 ? (
          <p className="text-sm text-text-muted">
            No pod rosters yet. Save settings and generate pods when the roster is ready.
          </p>
        ) : (
          <PodsMembershipPreview pods={pods} unitLabel={unitLabel} />
        )}
      </Modal>
      <SideActionReportPreviewModal
        isOpen={previewDoc != null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </>
  );
};

export default EventPodsViewerModal;
