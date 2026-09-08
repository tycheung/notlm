import React, { useState } from 'react';
import type { MysteryDoublesReportListMode } from '../../../../api/side-actions';
import { getErrorMessage } from '../../../../api/apiErrors';
import type { ReportDocument } from '../../../../utils/sideActionReportPrint';
import {
  MysteryDoublesEntrySummaryOptions,
  MysteryDoublesReportOptions,
} from './MysteryDoublesReportOptionPanels';
import {
  buildMysteryDoublesEntrySummaryDoc,
  buildMysteryDoublesReportDoc,
  buildEventEntrySummaryDoc,
  type ReportContextIds,
  type EntrySummaryScope,
} from '../../../../components/side_actions/reports/openPotReportBuilders';

export type MysteryDoublesReportStep =
  | 'mystery_doubles_entry_summary_options'
  | 'mystery_doubles_options';

interface MysteryDoublesReportFlowProps {
  step: MysteryDoublesReportStep;
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

const MysteryDoublesReportFlow: React.FC<MysteryDoublesReportFlowProps> = ({
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
  const [listMode, setListMode] = useState<MysteryDoublesReportListMode>('winners');

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
        await buildMysteryDoublesEntrySummaryDoc(ctx, entrySummaryScope, poolId)
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Mystery Doubles entry summary.'));
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
      setPreviewDoc(await buildMysteryDoublesReportDoc(ctx, listMode, poolId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Mystery Doubles report.'));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'mystery_doubles_entry_summary_options') {
    return (
      <MysteryDoublesEntrySummaryOptions
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
    <MysteryDoublesReportOptions
      listMode={listMode}
      onListModeChange={setListMode}
      busy={busy}
      canPreview={selectedPoolId != null}
      onBack={onBack}
      onPreview={() => void runReport()}
    />
  );
};

export default MysteryDoublesReportFlow;
