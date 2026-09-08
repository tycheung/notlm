import React, { useState } from 'react';
import type { LoveDoublesReportListMode } from '../../../../api/side-actions';
import { getErrorMessage } from '../../../../api/apiErrors';
import type { ReportDocument } from '../../../../utils/sideActionReportPrint';
import {
  LoveDoublesEntrySummaryOptions,
  LoveDoublesReportOptions,
} from './LoveDoublesReportOptionPanels';
import {
  buildLoveDoublesEntrySummaryDoc,
  buildLoveDoublesReportDoc,
  buildEventEntrySummaryDoc,
  type ReportContextIds,
  type EntrySummaryScope,
} from '../../../../components/side_actions/reports/openPotReportBuilders';

export type LoveDoublesReportStep =
  | 'love_doubles_entry_summary_options'
  | 'love_doubles_options';

interface LoveDoublesReportFlowProps {
  step: LoveDoublesReportStep;
  sideActionName: string;
  selectedPoolId: number | null;
  entrySummaryScope: EntrySummaryScope;
  onEntrySummaryScopeChange: (scope: EntrySummaryScope) => void;
  requireContextIds: () => ReportContextIds | null;
  requirePoolSelection: () => number | null;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (message: string | null) => void;
  setPreviewDoc: (doc: ReportDocument) => void;
  onBack: () => void;
}

const LoveDoublesReportFlow: React.FC<LoveDoublesReportFlowProps> = ({
  step,
  sideActionName,
  selectedPoolId,
  entrySummaryScope,
  onEntrySummaryScopeChange,
  requireContextIds,
  requirePoolSelection,
  busy,
  setBusy,
  setError,
  setPreviewDoc,
  onBack,
}) => {
  const [listMode, setListMode] = useState<LoveDoublesReportListMode>('winners');

  const runEntrySummary = async () => {
    if (entrySummaryScope === 'all_side_actions') {
      setBusy(true);
      setError(null);
      try {
        const ctx = requireContextIds();
        if (!ctx) return;
        setPreviewDoc(await buildEventEntrySummaryDoc(ctx));
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to build event entry summary.'));
      } finally {
        setBusy(false);
      }
      return;
    }
    const poolId =
      entrySummaryScope === 'this' ? requirePoolSelection() : undefined;
    if (poolId === null) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      setPreviewDoc(
        await buildLoveDoublesEntrySummaryDoc(ctx, entrySummaryScope, poolId)
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Love Doubles entry summary.'));
    } finally {
      setBusy(false);
    }
  };

  const runReport = async () => {
    const poolId = requirePoolSelection();
    if (poolId == null) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      setPreviewDoc(await buildLoveDoublesReportDoc(ctx, listMode, poolId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Love Doubles report.'));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'love_doubles_entry_summary_options') {
    return (
      <LoveDoublesEntrySummaryOptions
        sideActionName={sideActionName}
        scope={entrySummaryScope}
        onScopeChange={onEntrySummaryScopeChange}
        busy={busy}
        poolSelected={selectedPoolId != null}
        onBack={onBack}
        onPreview={() => void runEntrySummary()}
      />
    );
  }

  return (
    <LoveDoublesReportOptions
      listMode={listMode}
      onListModeChange={setListMode}
      busy={busy}
      canPreview={selectedPoolId != null}
      onBack={onBack}
      onPreview={() => void runReport()}
    />
  );
};

export default LoveDoublesReportFlow;
