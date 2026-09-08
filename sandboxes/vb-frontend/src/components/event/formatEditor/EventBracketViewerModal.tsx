import React, { useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import SideActionReportPreviewModal from '../../side_actions/reports/SideActionReportPreviewModal';
import { buildEventBracketReportDocument } from '../../event-reports/buildEventBracketReportDocument';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import EventBracketViewer, {
  type EventBracketViewerProps,
} from './EventBracketViewer';

interface EventBracketViewerModalProps extends EventBracketViewerProps {
  isOpen: boolean;
  onClose: () => void;
  roundName?: string;
  tournamentName?: string | null;
  eventName?: string | null;
}

const EventBracketViewerModal: React.FC<EventBracketViewerModalProps> = ({
  isOpen,
  onClose,
  roundName,
  tournamentName,
  eventName,
  ...viewerProps
}) => {
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);

  const openPrintPreview = () => {
    setPreviewDoc(
      buildEventBracketReportDocument({
        matchSeries: viewerProps.matchSeries,
        isTeamEvent: viewerProps.isTeamEvent,
        bracketMode: viewerProps.bracketMode,
        teams: viewerProps.teams,
        participants: viewerProps.participants,
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
        title={roundName ? `Bracket — ${roundName}` : 'Bracket'}
        size="full"
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
              disabled={viewerProps.matchSeries.length === 0}
              onClick={openPrintPreview}
            >
              Print preview
            </Button>
          </div>
        }
      >
        <EventBracketViewer {...viewerProps} />
      </Modal>
      <SideActionReportPreviewModal
        isOpen={previewDoc != null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </>
  );
};

export default EventBracketViewerModal;
