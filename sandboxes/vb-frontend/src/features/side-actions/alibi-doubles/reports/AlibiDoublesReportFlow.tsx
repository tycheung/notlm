import React, { useState } from 'react';
import type { AlibiDoublesReportListMode } from '../../../../api/side-actions';
import { getErrorMessage } from '../../../../api/apiErrors';
import type { ReportDocument } from '../../../../utils/sideActionReportPrint';
import {
  AlibiDoublesEntrySummaryOptions,
  AlibiDoublesReportOptions,
  AlibiDoublesSignupSlipsOptions,
} from './AlibiDoublesReportOptionPanels';
import {
  buildAlibiDoublesEntrySummaryDoc,
  buildAlibiDoublesReportDoc,
  buildEventEntrySummaryDoc,
  type ReportContextIds,
  type EntrySummaryScope,
} from '../../../../components/side_actions/reports/openPotReportBuilders';
import { buildAlibiDoublesSignupSlipsDocument } from './buildAlibiDoublesSignupSlipsDocument';

export type AlibiDoublesReportStep =
  | 'alibi_doubles_entry_summary_options'
  | 'alibi_doubles_options'
  | 'alibi_doubles_signup_slips_options';

interface AlibiDoublesReportFlowProps {
  step: AlibiDoublesReportStep;
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

const AlibiDoublesReportFlow: React.FC<AlibiDoublesReportFlowProps> = ({
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
  const [listMode, setListMode] = useState<AlibiDoublesReportListMode>('winners');
  const [slipPages, setSlipPages] = useState(1);

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
        await buildAlibiDoublesEntrySummaryDoc(ctx, entrySummaryScope, poolId)
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Alibi Doubles entry summary.'));
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
      setPreviewDoc(await buildAlibiDoublesReportDoc(ctx, listMode, poolId));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Alibi Doubles report.'));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'alibi_doubles_entry_summary_options') {
    return (
      <AlibiDoublesEntrySummaryOptions
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

  if (step === 'alibi_doubles_signup_slips_options') {
    return (
      <AlibiDoublesSignupSlipsOptions
        pages={slipPages}
        onPagesChange={setSlipPages}
        busy={busy}
        onBack={onBack}
        onPreview={() =>
          setPreviewDoc(
            buildAlibiDoublesSignupSlipsDocument({
              potName: sideActionName,
              pages: slipPages,
            })
          )
        }
      />
    );
  }

  return (
    <AlibiDoublesReportOptions
      listMode={listMode}
      onListModeChange={setListMode}
      busy={busy}
      canPreview={selectedPoolId != null}
      onBack={onBack}
      onPreview={() => void runReport()}
    />
  );
};

export default AlibiDoublesReportFlow;
