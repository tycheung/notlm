import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import SideActionReportPreviewModal from '../side_actions/reports/SideActionReportPreviewModal';
import { buildStandingsQrPosterDocument } from '../event-reports/buildStandingsQrPosterDocument';
import {
  tournamentPublicLandingUrl,
  tournamentPublicStandingsUrl,
} from '../../utils/appUrl';
import type { ReportDocument } from '../../utils/sideActionReportPrint';

interface EventShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  tournamentId: number;
  eventName?: string;
  tournamentName?: string | null;
  centerName?: string | null;
  dateLabel?: string | null;
}

/**
 * Public share for an event — landing is the tournament page; standings QR is Live.
 */
const EventShareModal: React.FC<EventShareModalProps> = ({
  isOpen,
  onClose,
  eventId,
  tournamentId,
  eventName,
  tournamentName,
  centerName,
  dateLabel,
}) => {
  const [copied, setCopied] = useState<'landing' | 'standings' | null>(null);
  const [posterDoc, setPosterDoc] = useState<ReportDocument | null>(null);

  const landingUrl = useMemo(
    () => tournamentPublicLandingUrl(tournamentId),
    [tournamentId]
  );
  const standingsUrl = useMemo(
    () => tournamentPublicStandingsUrl(tournamentId, eventId),
    [tournamentId, eventId]
  );

  const copy = async (kind: 'landing' | 'standings', url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const openPoster = () => {
    setPosterDoc(
      buildStandingsQrPosterDocument({
        tournamentName: tournamentName || 'Tournament',
        eventName,
        centerName,
        dateLabel,
        standingsUrl,
      })
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Share tournament" size="medium">
        <p className="text-text-muted text-sm mb-4">
          Bowlers open the tournament page
          {eventName ? ` (${eventName})` : ''}. Public access is always the tournament URL.
          Print the standings poster to hang in the center.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary">Tournament page</label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Input
                readOnly
                fullWidth
                value={landingUrl}
                className="font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant="darkbackground"
                className="shrink-0"
                onClick={() => copy('landing', landingUrl)}
              >
                {copied === 'landing' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex justify-center pt-2 border-t border-border-muted">
            <div className="bg-surface-light p-3 rounded-lg inline-block border border-border">
              <QRCodeSVG value={landingUrl} size={200} level="M" includeMargin />
            </div>
          </div>
          <p className="text-center text-xs text-text-muted">Scan to open the tournament page</p>

          <div>
            <label className="block text-sm font-medium text-primary">Live standings</label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Input
                readOnly
                fullWidth
                value={standingsUrl}
                className="font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant="darkbackground"
                className="shrink-0"
                onClick={() => copy('standings', standingsUrl)}
              >
                {copied === 'standings' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <Button type="button" variant="primary" className="w-full" onClick={openPoster}>
            Print standings poster
          </Button>
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

export default EventShareModal;
