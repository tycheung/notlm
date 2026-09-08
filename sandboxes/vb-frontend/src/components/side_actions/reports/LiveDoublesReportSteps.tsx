import React from 'react';
import LoveDoublesReportFlow, {
  type LoveDoublesReportStep,
} from '../../../features/side-actions/love-doubles/reports/LoveDoublesReportFlow';
import AlibiDoublesReportFlow, {
  type AlibiDoublesReportStep,
} from '../../../features/side-actions/alibi-doubles/reports/AlibiDoublesReportFlow';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import type { EntrySummaryScope } from './reports/EntrySummaryScopeField';

type LiveDoublesStep = LoveDoublesReportStep | AlibiDoublesReportStep;

interface LiveDoublesReportStepsProps {
  step: LiveDoublesStep;
  sideActionName: string;
  selectedPoolId: number | null;
  loveEntrySummaryScope: EntrySummaryScope;
  alibiEntrySummaryScope: EntrySummaryScope;
  onLoveEntrySummaryScopeChange: (scope: EntrySummaryScope) => void;
  onAlibiEntrySummaryScopeChange: (scope: EntrySummaryScope) => void;
  requireContextIds: () => { sideActionId: number; tournamentId: number; eventId: number } | null;
  requirePoolSelection: () => number | null;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (message: string | null) => void;
  setPreviewDoc: (doc: ReportDocument | null) => void;
  onBack: () => void;
}

const LiveDoublesReportSteps: React.FC<LiveDoublesReportStepsProps> = ({
  step,
  sideActionName,
  selectedPoolId,
  loveEntrySummaryScope,
  alibiEntrySummaryScope,
  onLoveEntrySummaryScopeChange,
  onAlibiEntrySummaryScopeChange,
  requireContextIds,
  requirePoolSelection,
  busy,
  setBusy,
  setError,
  setPreviewDoc,
  onBack,
}) => {
  if (step === 'love_doubles_entry_summary_options' || step === 'love_doubles_options') {
    return (
      <LoveDoublesReportFlow
        step={step}
        sideActionName={sideActionName}
        selectedPoolId={selectedPoolId}
        entrySummaryScope={loveEntrySummaryScope}
        onEntrySummaryScopeChange={onLoveEntrySummaryScopeChange}
        requireContextIds={requireContextIds}
        requirePoolSelection={requirePoolSelection}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
        setPreviewDoc={setPreviewDoc}
        onBack={onBack}
      />
    );
  }

  if (
    step === 'alibi_doubles_entry_summary_options' ||
    step === 'alibi_doubles_options' ||
    step === 'alibi_doubles_signup_slips_options'
  ) {
    return (
      <AlibiDoublesReportFlow
        step={step}
        sideActionName={sideActionName}
        selectedPoolId={selectedPoolId}
        entrySummaryScope={alibiEntrySummaryScope}
        onEntrySummaryScopeChange={onAlibiEntrySummaryScopeChange}
        requireContextIds={requireContextIds}
        requirePoolSelection={requirePoolSelection}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
        setPreviewDoc={setPreviewDoc}
        onBack={onBack}
      />
    );
  }

  return null;
};

export default LiveDoublesReportSteps;
