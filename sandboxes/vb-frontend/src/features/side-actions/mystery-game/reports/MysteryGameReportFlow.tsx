import React from 'react';
import { getErrorMessage } from '../../../../api/apiErrors';
import type { ReportDocument } from '../../../../utils/sideActionReportPrint';
import {
  MysteryGameEntrySummaryOptions,
  MysteryGameReportOptions,
} from './MysteryGameReportOptionPanels';
import {
  buildMysteryGameEntrySummaryDoc,
  buildMysteryGameReportDoc,
  buildEventEntrySummaryDoc,
  type ReportContextIds,
  type EntrySummaryScope,
} from '../../../../components/side_actions/reports/openPotReportBuilders';

export type MysteryGameReportStep =
  | 'mystery_game_entry_summary_options'
  | 'mystery_game_options';

interface MysteryGameReportFlowProps {
  step: MysteryGameReportStep;
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

const MysteryGameReportFlow: React.FC<MysteryGameReportFlowProps> = ({
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
        await buildMysteryGameEntrySummaryDoc(ctx, entrySummaryScope, poolId)
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Mystery Game entry summary.'));
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
      setPreviewDoc(await buildMysteryGameReportDoc(ctx, poolId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Mystery Game report.'));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'mystery_game_entry_summary_options') {
    return (
      <MysteryGameEntrySummaryOptions
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
    <MysteryGameReportOptions
      busy={busy}
      canPreview={selectedPoolId != null}
      onBack={onBack}
      onPreview={() => void runReport()}
    />
  );
};

export default MysteryGameReportFlow;
