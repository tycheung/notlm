import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import {
  downloadReportHtml,
  printReportIframe,
} from '../../../utils/sideActionReportPrint';

interface SideActionReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ReportDocument | null;
}

/**
 * In-app report preview. Avoids blank popup tabs (Cursor Simple Browser / blocked popups).
 * Print opens the system dialog (Save as PDF from there). Download saves .html as fallback.
 *
 * Large Brackets Reports: load via blob URL (not srcdoc) and wait for settle before Print —
 * Chrome’s PDF engine often fails if print() runs while a huge HTML document is still parsing.
 */
const SideActionReportPreviewModal: React.FC<SideActionReportPreviewModalProps> = ({
  isOpen,
  onClose,
  document: reportDoc,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !reportDoc || !iframeRef.current) return;
    const iframe = iframeRef.current;
    setIframeReady(false);
    setPrintError(null);

    // Blob URLs are more reliable than srcdoc for multi-page bracket books in Chromium.
    const blob = new Blob([reportDoc.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    let cancelled = false;
    let settleTimer = 0;

    const onLoad = () => {
      // Scale settle time with document size (brackets ~19+ pages).
      const settleMs = Math.min(
        900,
        80 + Math.floor(reportDoc.html.length / 40_000) * 120
      );
      settleTimer = window.setTimeout(() => {
        if (!cancelled) setIframeReady(true);
      }, settleMs);
    };

    iframe.addEventListener('load', onLoad);
    iframe.src = url;

    return () => {
      cancelled = true;
      iframe.removeEventListener('load', onLoad);
      window.clearTimeout(settleTimer);
      iframe.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [isOpen, reportDoc]);

  if (!reportDoc) return null;

  const handlePrint = () => {
    setPrintError(null);
    try {
      printReportIframe(iframeRef.current, reportDoc.suggestedFilename);
    } catch (err) {
      setPrintError(
        err instanceof Error
          ? err.message
          : 'Print failed. Try Download HTML, then open that file and Print → Save as PDF.'
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={reportDoc.title}
      size="xlarge"
      closeOnOutsideClick={false}
    >
      <div className="space-y-3">
        <p className="text-sm text-text-muted">
          Preview below. Use <strong className="text-text">Print / Save as PDF</strong> for
          center postings, or download HTML if the print dialog is unavailable.
        </p>
        {printError && (
          <p className="text-sm text-amber-200/90">{printError}</p>
        )}
        <div className="rounded border border-border bg-white overflow-hidden">
          <iframe
            ref={iframeRef}
            title={reportDoc.title}
            className="w-full bg-white"
            style={{ height: '70vh', border: 0 }}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="lightbackground" size="small" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="lightbackground"
            size="small"
            onClick={() => void downloadReportHtml(reportDoc)}
          >
            Download HTML
          </Button>
          <Button
            variant="primary"
            size="small"
            disabled={!iframeReady}
            onClick={handlePrint}
          >
            {iframeReady ? 'Print / Save as PDF' : 'Loading preview…'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SideActionReportPreviewModal;
