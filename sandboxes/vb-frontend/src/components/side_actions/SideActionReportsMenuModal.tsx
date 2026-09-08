import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import {
  SideActionsAPI,
  type AliveListDisplayMode,
  type EliminatorReportDisplayMode,
  type HighGameReportListMode,
  type HighSetReportListMode,
} from '../../api/side-actions';
import { SideActionType, SideActionStatus } from '../../types/side_action';
import { getErrorMessage } from '../../api/apiErrors';
import { buildSignupSheetReportDocument } from './reports/buildSignupSheetReportDocument';
import { buildAliveListReportDocument } from './reports/buildAliveListReportDocument';
import { BRACKETS_REPORT_DEFAULT_CHUNK_POTS } from './reports/buildBracketsReportDocument';
import { fetchBracketsReportDocument } from './reports/fetchBracketsReportDocument';
import { buildPayoutReportDocument } from './reports/buildPayoutReportDocument';
import { buildIndividualBracketReportDocument } from './reports/buildIndividualBracketReportDocument';
import { buildEliminatorReportDocument } from './reports/buildEliminatorReportDocument';
import SideActionReportPreviewModal from './reports/SideActionReportPreviewModal';
import {
  HighGameEntrySummaryOptions,
  HighGameReportOptions,
} from './reports/HighGameReportOptionPanels';
import {
  HighSetEntrySummaryOptions,
  HighSetReportOptions,
} from './reports/HighSetReportOptionPanels';
import MysteryDoublesReportFlow, {
  type MysteryDoublesReportStep,
} from '../../features/side-actions/mystery-doubles/reports/MysteryDoublesReportFlow';
import MysteryGameReportFlow, {
  type MysteryGameReportStep,
} from '../../features/side-actions/mystery-game/reports/MysteryGameReportFlow';
import type { LoveDoublesReportStep } from '../../features/side-actions/love-doubles/reports/LoveDoublesReportFlow';
import type { AlibiDoublesReportStep } from '../../features/side-actions/alibi-doubles/reports/AlibiDoublesReportFlow';
import LiveDoublesReportSteps from './reports/LiveDoublesReportSteps';
import {
  DOUBLES_REPORT_STEP_BY_ID,
  sideActionReportStepTitle,
} from './reports/sideActionReportStepTitle';
import {
  buildEntrySummaryPreviewDoc,
  buildHighGameReportDoc,
  buildHighSetReportDoc,
  buildOpenPotEntrySummaryDoc,
  loadHighGameEffectiveOptions,
  OPEN_POT_ENTRY_SUMMARY_ERRORS,
  type EntrySummaryScope,
  type OpenPotEntrySummaryKind,
} from './reports/openPotReportBuilders';
import EntrySummaryScopeField, {
  entrySummaryCanPreview,
  isEventWideEntrySummaryScope,
} from './reports/EntrySummaryScopeField';
import {
  reportsForType,
  type SideActionReportKind,
} from './reports/reportMenuDefs';
import type { ReportDocument } from '../../utils/sideActionReportPrint';
import ReportPoolScopeField from './reports/ReportPoolScopeField';
import SideActionReportMenuStep from './reports/SideActionReportMenuStep';
import SignupSheetOptions from './reports/SignupSheetOptions';
import {
  AliveListOptions,
  BracketsWallSheetOptions,
  IndividualBracketOptions,
  type BracketEntrantOption,
} from './reports/BracketReportOptionPanels';
import {
  EliminatorEntrySummaryOptions,
  EliminatorReportOptions,
} from './reports/EliminatorReportOptionPanels';

interface SideActionReportsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideActionId: number;
  sideActionName: string;
  /** Opener SA type — filters which reports appear. Signup + payout always shown. */
  sideActionType?: SideActionType;
  tournamentId: number;
  eventId: number;
}

type OptionsStep =
  | 'menu'
  | 'signup_options'
  | 'entry_summary_options'
  | 'brackets_options'
  | 'alive_list_options'
  | 'individual_bracket_options'
  | 'payout_options'
  | 'high_game_entry_summary_options'
  | 'high_game_options'
  | 'high_set_entry_summary_options'
  | 'high_set_options'
  | 'eliminator_entry_summary_options'
  | 'eliminator_options'
  | MysteryDoublesReportStep
  | MysteryGameReportStep
  | LoveDoublesReportStep
  | AlibiDoublesReportStep;

const SideActionReportsMenuModal: React.FC<SideActionReportsMenuModalProps> = ({
  isOpen,
  onClose,
  sideActionId,
  sideActionName,
  sideActionType = SideActionType.BRACKET,
  tournamentId,
  eventId,
}) => {
  const [step, setStep] = useState<OptionsStep>('menu');
  const [signupMode, setSignupMode] = useState<'roster' | 'blank'>('roster');
  const [entryCells, setEntryCells] = useState<'current' | 'blank'>('current');
  const [blankPages, setBlankPages] = useState(1);
  const [entrySummaryScope, setEntrySummaryScope] = useState<EntrySummaryScope>('this');
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [bracketsPotFrom, setBracketsPotFrom] = useState(1);
  const [bracketsPotTo, setBracketsPotTo] = useState(BRACKETS_REPORT_DEFAULT_CHUNK_POTS);
  const [bracketsTotalKnown, setBracketsTotalKnown] = useState<number | null>(null);
  const [aliveDisplayMode, setAliveDisplayMode] =
    useState<AliveListDisplayMode>('bracket_numbers');
  const [aliveScope, setAliveScope] = useState<'this' | 'all'>('this');
  const [aliveAsOfGame, setAliveAsOfGame] = useState<number | 'current'>('current');
  const [aliveGameWindow, setAliveGameWindow] = useState<number[]>([]);
  const [aliveAvailableGames, setAliveAvailableGames] = useState<number[]>([]);
  const [individualEntrants, setIndividualEntrants] = useState<BracketEntrantOption[]>([]);
  const [individualUserId, setIndividualUserId] = useState<number | ''>('');
  const [individualScope, setIndividualScope] = useState<'this' | 'all'>('this');
  const [entryUnit, setEntryUnit] = useState<'bowler' | 'team'>('bowler');
  const [payoutIncludeEntered, setPayoutIncludeEntered] = useState(true);
  const [payoutIncludeCollected, setPayoutIncludeCollected] = useState(true);
  const [payoutGroupBy, setPayoutGroupBy] = useState<'bowler' | 'team'>('bowler');
  const [payoutTeamHeaderPayouts, setPayoutTeamHeaderPayouts] = useState(true);
  const [hgEntrySummaryScope, setHgEntrySummaryScope] = useState<EntrySummaryScope>('this');
  const [hgAvailableGames, setHgAvailableGames] = useState<number[]>([1, 2, 3]);
  const [hgSelectedGames, setHgSelectedGames] = useState<number[]>([1, 2, 3]);
  const [hgPayoutMode, setHgPayoutMode] =
    useState<'per_game' | 'combined'>('per_game');
  const [hgListMode, setHgListMode] = useState<HighGameReportListMode>('winners');
  const [hgOptionsPoolId, setHgOptionsPoolId] = useState<number | null>(null);
  const [aliveOptionsPoolId, setAliveOptionsPoolId] = useState<number | null>(null);
  const [hsEntrySummaryScope, setHsEntrySummaryScope] = useState<EntrySummaryScope>('this');
  const [hsListMode, setHsListMode] = useState<HighSetReportListMode>('winners');
  const [elimEntrySummaryScope, setElimEntrySummaryScope] = useState<EntrySummaryScope>('this');
  const [elimDisplayMode, setElimDisplayMode] =
    useState<EliminatorReportDisplayMode>('columns');
  const [elimColumnsAvailable, setElimColumnsAvailable] = useState(true);
  const [elimGameCount, setElimGameCount] = useState(3);
  const [elimOptionsPoolId, setElimOptionsPoolId] = useState<number | null>(null);
  const [mdEntrySummaryScope, setMdEntrySummaryScope] = useState<EntrySummaryScope>('this');
  const [mgEntrySummaryScope, setMgEntrySummaryScope] = useState<EntrySummaryScope>('this');
  const [ldEntrySummaryScope, setLdEntrySummaryScope] = useState<EntrySummaryScope>('this');
  const [adEntrySummaryScope, setAdEntrySummaryScope] = useState<EntrySummaryScope>('this');
  const [busy, setBusy] = useState(false);

  const visibleReports = reportsForType(sideActionType);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    void SideActionsAPI.getSideAction(sideActionId)
      .then((sideAction) => {
        if (!current) return;
        setEntryUnit(
          sideAction.type_config?.entry_unit === 'team' ? 'team' : 'bowler'
        );
      })
      .catch(() => {
        if (current) setEntryUnit('bowler');
      });
    return () => {
      current = false;
    };
  }, [isOpen, sideActionId]);

  useEffect(() => {
    if (!isOpen || step !== 'high_game_options') return;
    if (selectedPoolId == null) {
      setHgAvailableGames([]);
      setHgSelectedGames([]);
      setHgOptionsPoolId(null);
      return;
    }
    let current = true;
    setHgOptionsPoolId(null);
    setHgAvailableGames([]);
    setHgSelectedGames([]);
    setBusy(true);
    void loadHighGameEffectiveOptions(sideActionId, selectedPoolId)
      .then(({ gameNumbers, payoutMode }) => {
        if (!current) return;
        setHgAvailableGames(gameNumbers);
        setHgSelectedGames(gameNumbers);
        setHgPayoutMode(payoutMode);
        setHgOptionsPoolId(selectedPoolId);
        setError(
          gameNumbers.length ? null : 'This squad pool has no configured High Game games.'
        );
      })
      .catch((err) => {
        if (current) {
          setError(getErrorMessage(err, 'Failed to load High Game options.'));
        }
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [isOpen, selectedPoolId, sideActionId, step]);

  useEffect(() => {
    if (!isOpen || step !== 'alive_list_options') return;
    if (aliveScope === 'all') {
      setAliveGameWindow([]);
      setAliveAvailableGames([]);
      setAliveAsOfGame('current');
      setAliveOptionsPoolId(-1);
      setError(null);
      return;
    }
    if (selectedPoolId == null) {
      setAliveGameWindow([]);
      setAliveAvailableGames([]);
      setAliveOptionsPoolId(null);
      return;
    }
    let current = true;
    setAliveOptionsPoolId(null);
    setBusy(true);
    void SideActionsAPI.getSideAction(sideActionId)
      .then((sideAction) => {
        if (!current) return;
        const games =
          sideAction.pools.find((pool) => pool.id === selectedPoolId)?.game_numbers ?? [];
        setAliveGameWindow(games);
        setAliveAvailableGames(games);
        setAliveAsOfGame('current');
        setAliveOptionsPoolId(selectedPoolId);
        setError(games.length ? null : 'This squad pool has no configured bracket games.');
      })
      .catch((err) => {
        if (current) setError(getErrorMessage(err, 'Failed to load alive-list options.'));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [isOpen, selectedPoolId, sideActionId, step, aliveScope]);

  useEffect(() => {
    if (!isOpen || step !== 'eliminator_options') return;
    if (selectedPoolId == null) {
      setElimOptionsPoolId(null);
      return;
    }
    let current = true;
    setElimOptionsPoolId(null);
    setBusy(true);
    void SideActionsAPI.getSideAction(sideActionId)
      .then((sideAction) => {
        if (!current) return;
        const length = Math.max(
          1,
          sideAction.pools.find((pool) => pool.id === selectedPoolId)?.game_numbers.length ?? 0
        );
        const columnsOk = length <= 4;
        setElimGameCount(length);
        setElimColumnsAvailable(columnsOk);
        setElimDisplayMode(columnsOk ? 'columns' : 'pages');
        setElimOptionsPoolId(selectedPoolId);
        setError(null);
      })
      .catch((err) => {
        if (current) setError(getErrorMessage(err, 'Failed to load Eliminator options.'));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [isOpen, selectedPoolId, sideActionId, step]);

  const requirePoolSelection = (): number | null => {
    if (selectedPoolId == null) {
      setError('Select one squad pool before previewing this report.');
      return null;
    }
    return selectedPoolId;
  };

  const resetAndClose = () => {
    setStep('menu');
    setError(null);
    setBusy(false);
    setPreviewDoc(null);
    onClose();
  };

  const requireContextIds = (): { tid: number; eid: number; sid: number } | null => {
    const tid = Number(tournamentId);
    const eid = Number(eventId);
    const sid = Number(sideActionId);
    if (!Number.isFinite(tid) || tid <= 0 || !Number.isFinite(eid) || eid <= 0) {
      setError(
        'Missing tournament or event context for this report. Refresh the event page and try again.'
      );
      return null;
    }
    if (!Number.isFinite(sid) || sid <= 0) {
      setError('Missing side action context for this report. Close and reopen Reports.');
      return null;
    }
    return { tid, eid, sid };
  };

  const runSignupSheet = async () => {
    setBusy(true);
    setError(null);
    const pagesForBlank = Math.min(20, Math.max(1, blankPages || 1));
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      const report = await SideActionsAPI.getSignupSheetReport({
        tournament_id: ctx.tid,
        event_id: ctx.eid,
        mode: signupMode,
        blank_pages: signupMode === 'blank' ? pagesForBlank : 1,
      });
      setPreviewDoc(
        buildSignupSheetReportDocument(report, {
          entryCells: signupMode === 'blank' ? 'blank' : entryCells,
          blankPages: signupMode === 'blank' ? pagesForBlank : undefined,
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build sign-up sheet.'));
    } finally {
      setBusy(false);
    }
  };

  const runEntrySummary = async () => {
    const poolId = entrySummaryScope === 'this' ? requirePoolSelection() : undefined;
    if (entrySummaryScope === 'this' && poolId === null) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      setPreviewDoc(
        await buildEntrySummaryPreviewDoc(ctx, entrySummaryScope, poolId)
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build entry summary.'));
    } finally {
      setBusy(false);
    }
  };

  const runAliveList = async () => {
    const poolId = aliveScope === 'this' ? requirePoolSelection() : undefined;
    if (poolId === null) return;
    if (aliveScope === 'this' && aliveOptionsPoolId !== poolId) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      const report = await SideActionsAPI.getAliveListReport({
        side_action_id: ctx.sid,
        tournament_id: ctx.tid,
        event_id: ctx.eid,
        display_mode: aliveDisplayMode,
        as_of_game: aliveScope === 'this' && aliveAsOfGame !== 'current' ? aliveAsOfGame : null,
        scope: aliveScope,
        pool_id: poolId,
      });
      if (aliveScope === 'this') {
        setAliveGameWindow(report.game_window || []);
        setAliveAvailableGames(report.available_games || []);
      }
      setPreviewDoc(buildAliveListReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build alive list.'));
    } finally {
      setBusy(false);
    }
  };

  const runBracketsReport = async () => {
    const poolId = requirePoolSelection();
    if (poolId == null) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      const result = await fetchBracketsReportDocument({
        sideActionId: ctx.sid,
        tournamentId: ctx.tid,
        eventId: ctx.eid,
        poolId,
        potFrom: bracketsPotFrom,
        potTo: bracketsPotTo,
      });
      setBracketsTotalKnown(result.bracketCount);
      setPreviewDoc(result.document);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build brackets report.'));
    } finally {
      setBusy(false);
    }
  };

  const runPayoutReport = async () => {
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      const report = await SideActionsAPI.getPayoutReport({
        tournament_id: ctx.tid,
        event_id: ctx.eid,
        group_by: payoutGroupBy,
        team_header_payouts: payoutGroupBy !== 'team' || payoutTeamHeaderPayouts,
      });
      setPreviewDoc(
        buildPayoutReportDocument(report, {
          includeEntered: payoutIncludeEntered,
          includeCollected: payoutIncludeCollected,
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build payout report.'));
    } finally {
      setBusy(false);
    }
  };

  const runOpenPotEntrySummary = async (
    kind: OpenPotEntrySummaryKind,
    scope: EntrySummaryScope
  ) => {
    const poolId = scope === 'this' ? requirePoolSelection() : undefined;
    if (scope === 'this' && poolId === null) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      setPreviewDoc(await buildOpenPotEntrySummaryDoc(kind, ctx, scope, poolId));
    } catch (err) {
      setError(getErrorMessage(err, OPEN_POT_ENTRY_SUMMARY_ERRORS[kind]));
    } finally {
      setBusy(false);
    }
  };

  const openHighGameOptions = () => {
    setError(null);
    setHgListMode('winners');
    setStep('high_game_options');
  };

  const runHighGameReport = async () => {
    const poolId = requirePoolSelection();
    if (poolId == null || hgOptionsPoolId !== poolId) return;
    if (hgSelectedGames.length === 0) {
      setError('Select at least one game to include.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      setPreviewDoc(
        await buildHighGameReportDoc(
          ctx,
          hgSelectedGames,
          hgListMode,
          poolId
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build High Game report.'));
    } finally {
      setBusy(false);
    }
  };

  const runHighSetReport = async () => {
    const poolId = requirePoolSelection();
    if (poolId == null) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      setPreviewDoc(
        await buildHighSetReportDoc(
          ctx,
          hsListMode,
          poolId
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build High Series report.'));
    } finally {
      setBusy(false);
    }
  };

  const openEliminatorOptions = () => {
    setError(null);
    setStep('eliminator_options');
  };

  const runEliminatorReport = async () => {
    const poolId = requirePoolSelection();
    if (poolId == null || elimOptionsPoolId !== poolId) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      const mode: EliminatorReportDisplayMode =
        elimDisplayMode === 'columns' && elimColumnsAvailable ? 'columns' : 'pages';
      const report = await SideActionsAPI.getEliminatorReport({
        side_action_id: ctx.sid,
        tournament_id: ctx.tid,
        event_id: ctx.eid,
        display_mode: mode,
        pool_id: poolId,
      });
      setPreviewDoc(buildEliminatorReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build Eliminator report.'));
    } finally {
      setBusy(false);
    }
  };

  const openIndividualBracketOptions = async () => {
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      const sideActions = await SideActionsAPI.getSideActions({
        tournament_id: ctx.tid,
        event_id: ctx.eid,
        active_only: false,
      });
      const bracketSas = sideActions.filter(
        (sa) =>
          sa.side_action_type === SideActionType.BRACKET &&
          sa.status !== SideActionStatus.CANCELED
      );
      const lists = await Promise.all(
        (bracketSas.length ? bracketSas : [{ id: ctx.sid } as { id: number }]).map((sa) =>
          SideActionsAPI.getEntrants(sa.id)
        )
      );
      const byUser = new Map<number, EntrantOption>();
      for (const list of lists) {
        for (const e of list) {
          const prev = byUser.get(e.user_id);
          if (prev) {
            prev.entry_count += e.entry_count || 0;
          } else {
            byUser.set(e.user_id, {
              user_id: e.user_id,
              display_name: e.display_name,
              entry_count: e.entry_count || 0,
            });
          }
        }
      }
      const sorted = Array.from(byUser.values()).sort((a, b) =>
        a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })
      );
      setIndividualEntrants(sorted);
      setIndividualUserId(sorted[0]?.user_id ?? '');
      setIndividualScope('this');
      setStep('individual_bracket_options');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load participants for this report.'));
    } finally {
      setBusy(false);
    }
  };

  const runIndividualBracketReport = async () => {
    if (individualUserId === '' || individualUserId <= 0) {
      setError('Select a bowler to continue.');
      return;
    }
    const poolId = individualScope === 'this' ? requirePoolSelection() : undefined;
    if (poolId === null) return;
    setBusy(true);
    setError(null);
    try {
      const ctx = requireContextIds();
      if (!ctx) return;
      const report = await SideActionsAPI.getIndividualBracketReport({
        side_action_id: ctx.sid,
        tournament_id: ctx.tid,
        event_id: ctx.eid,
        user_id: individualUserId,
        scope: individualScope,
        pool_id: poolId,
      });
      setPreviewDoc(buildIndividualBracketReportDocument(report));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build individual bracket report.'));
    } finally {
      setBusy(false);
    }
  };

  const openAliveOptions = () => {
    setError(null);
    setAliveScope('this');
    setStep('alive_list_options');
  };

  const onPickReport = (reportId: SideActionReportKind) => {
    if (reportId === 'signup_sheet') {
      setStep('signup_options');
      return;
    }
    if (reportId === 'entry_summary') {
      setStep('entry_summary_options');
      return;
    }
    if (reportId === 'alive_list') {
      openAliveOptions();
      return;
    }
    if (reportId === 'brackets') {
      setStep('brackets_options');
      return;
    }
    if (reportId === 'individual_bracket') {
      void openIndividualBracketOptions();
      return;
    }
    if (reportId === 'payout') {
      setStep('payout_options');
      return;
    }
    if (reportId === 'high_game_entry_summary') {
      setStep('high_game_entry_summary_options');
      return;
    }
    if (reportId === 'high_game') {
      openHighGameOptions();
      return;
    }
    if (reportId === 'high_set_entry_summary') {
      setStep('high_set_entry_summary_options');
      return;
    }
    if (reportId === 'high_set') {
      setHsListMode('winners');
      setStep('high_set_options');
      return;
    }
    if (reportId === 'eliminator_entry_summary') {
      setStep('eliminator_entry_summary_options');
      return;
    }
    if (reportId === 'eliminator') {
      openEliminatorOptions();
      return;
    }
    if (reportId === 'mystery_doubles_entry_summary') {
      setStep('mystery_doubles_entry_summary_options');
      return;
    }
    if (reportId === 'mystery_doubles') {
      setStep('mystery_doubles_options');
      return;
    }
    if (reportId === 'mystery_game_entry_summary') {
      setStep('mystery_game_entry_summary_options');
      return;
    }
    if (reportId === 'mystery_game') {
      setStep('mystery_game_options');
      return;
    }
    const doublesStep = DOUBLES_REPORT_STEP_BY_ID[reportId];
    if (doublesStep) {
      setStep(doublesStep as OptionsStep);
      return;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStep('menu');
      setError(null);
      setBusy(false);
      setIndividualEntrants([]);
      setIndividualUserId('');
      setIndividualScope('this');
      setPayoutIncludeEntered(true);
      setPayoutIncludeCollected(true);
      setHgEntrySummaryScope('this');
      setHgListMode('winners');
      setHsEntrySummaryScope('this');
      setHsListMode('winners');
      setElimEntrySummaryScope('this');
      setElimDisplayMode('columns');
      setElimColumnsAvailable(true);
      setHgOptionsPoolId(null);
      setAliveOptionsPoolId(null);
      setAliveScope('this');
      setElimOptionsPoolId(null);
      setMdEntrySummaryScope('this');
      setMgEntrySummaryScope('this');
      setLdEntrySummaryScope('this');
      setAdEntrySummaryScope('this');
      setSelectedPoolId(null);
    }
  }, [isOpen]);

  const optionsTitle = sideActionReportStepTitle(step, sideActionName);

  const poolSelectionRequired =
    (step === 'alive_list_options' && aliveScope === 'this') ||
    step === 'brackets_options' ||
    step === 'high_game_options' ||
    step === 'high_set_options' ||
    step === 'eliminator_options' ||
    step === 'mystery_doubles_options' ||
    step === 'mystery_game_options' ||
    step === 'love_doubles_options' ||
    step === 'alibi_doubles_options' ||
    (step === 'entry_summary_options' && entrySummaryScope === 'this') ||
    (step === 'individual_bracket_options' && individualScope === 'this') ||
    (step === 'high_game_entry_summary_options' && hgEntrySummaryScope === 'this') ||
    (step === 'high_set_entry_summary_options' && hsEntrySummaryScope === 'this') ||
    (step === 'eliminator_entry_summary_options' && elimEntrySummaryScope === 'this') ||
    (step === 'mystery_doubles_entry_summary_options' &&
      mdEntrySummaryScope === 'this') ||
    (step === 'mystery_game_entry_summary_options' &&
      mgEntrySummaryScope === 'this') ||
    (step === 'love_doubles_entry_summary_options' &&
      ldEntrySummaryScope === 'this') ||
    (step === 'alibi_doubles_entry_summary_options' &&
      adEntrySummaryScope === 'this');
  const showPoolSelector = ![
    'menu',
    'signup_options',
    'payout_options',
  ].includes(step) &&
    !(step === 'entry_summary_options' &&
      isEventWideEntrySummaryScope(entrySummaryScope)) &&
    !(step === 'alive_list_options' && aliveScope === 'all') &&
    !(step === 'individual_bracket_options' && individualScope === 'all') &&
    !(step === 'high_game_entry_summary_options' &&
      isEventWideEntrySummaryScope(hgEntrySummaryScope)) &&
    !(step === 'high_set_entry_summary_options' &&
      isEventWideEntrySummaryScope(hsEntrySummaryScope)) &&
    !(step === 'eliminator_entry_summary_options' &&
      isEventWideEntrySummaryScope(elimEntrySummaryScope)) &&
    !(
      step === 'mystery_doubles_entry_summary_options' &&
      isEventWideEntrySummaryScope(mdEntrySummaryScope)
    ) &&
    !(
      step === 'mystery_game_entry_summary_options' &&
      isEventWideEntrySummaryScope(mgEntrySummaryScope)
    ) &&
    !(
      step === 'love_doubles_entry_summary_options' &&
      isEventWideEntrySummaryScope(ldEntrySummaryScope)
    ) &&
    !(
      step === 'alibi_doubles_entry_summary_options' &&
      isEventWideEntrySummaryScope(adEntrySummaryScope)
    ) &&
    step !== 'alibi_doubles_signup_slips_options';

  return (
    <>
      <Modal
        isOpen={isOpen && !previewDoc}
        onClose={resetAndClose}
        title={optionsTitle}
        size="medium"
        closeOnOutsideClick={!busy}
      >
        {error && (
          <Alert variant="error" message={error} onDismiss={() => setError(null)} className="mb-3" />
        )}
        {showPoolSelector && (
          <div className="mb-4">
            <ReportPoolScopeField
              sideActionId={sideActionId}
              value={selectedPoolId}
              onChange={setSelectedPoolId}
              required={poolSelectionRequired}
            />
          </div>
        )}

        {step === 'menu' && (
          <SideActionReportMenuStep
            reports={visibleReports}
            busy={busy}
            onPick={onPickReport}
          />
        )}

        {step === 'brackets_options' && (
          <BracketsWallSheetOptions
            totalKnown={bracketsTotalKnown}
            potFrom={bracketsPotFrom}
            potTo={bracketsPotTo}
            onPotFromChange={setBracketsPotFrom}
            onPotToChange={setBracketsPotTo}
            busy={busy}
            canPreview={selectedPoolId !== null}
            onBack={() => setStep('menu')}
            onPreview={() => void runBracketsReport()}
          />
        )}

        {step === 'alive_list_options' && (
          <AliveListOptions
            sideActionName={sideActionName}
            scope={aliveScope}
            onScopeChange={setAliveScope}
            displayMode={aliveDisplayMode}
            onDisplayModeChange={setAliveDisplayMode}
            asOfGame={aliveAsOfGame}
            onAsOfGameChange={setAliveAsOfGame}
            gameWindow={aliveGameWindow}
            availableGames={aliveAvailableGames}
            busy={busy}
            canPreview={
              aliveScope === 'all' ||
              (selectedPoolId !== null && aliveOptionsPoolId === selectedPoolId)
            }
            onBack={() => setStep('menu')}
            onPreview={() => void runAliveList()}
          />
        )}

        {step === 'individual_bracket_options' && (
          <IndividualBracketOptions
            sideActionName={sideActionName}
            entrants={individualEntrants}
            selectedUserId={individualUserId}
            onSelectedUserIdChange={setIndividualUserId}
            scope={individualScope}
            onScopeChange={setIndividualScope}
            busy={busy}
            canPreview={
              individualEntrants.length > 0 &&
              individualUserId !== '' &&
              (individualScope === 'all' || selectedPoolId !== null)
            }
            onBack={() => setStep('menu')}
            onPreview={() => void runIndividualBracketReport()}
            entryUnit={entryUnit}
          />
        )}

        {step === 'high_game_entry_summary_options' && (
          <HighGameEntrySummaryOptions
            sideActionName={sideActionName}
            scope={hgEntrySummaryScope}
            onScopeChange={setHgEntrySummaryScope}
            busy={busy}
            poolSelected={selectedPoolId !== null}
            onBack={() => setStep('menu')}
            onPreview={() => void runOpenPotEntrySummary('high_game', hgEntrySummaryScope)}
          />
        )}

        {step === 'high_game_options' && (
          <HighGameReportOptions
            availableGames={hgAvailableGames}
            selectedGames={hgSelectedGames}
            onSelectedGamesChange={setHgSelectedGames}
            payoutMode={hgPayoutMode}
            listMode={hgListMode}
            onListModeChange={setHgListMode}
            busy={busy}
            optionsLoaded={
              selectedPoolId !== null && hgOptionsPoolId === selectedPoolId
            }
            onBack={() => setStep('menu')}
            onPreview={() => void runHighGameReport()}
          />
        )}

        {step === 'high_set_entry_summary_options' && (
          <HighSetEntrySummaryOptions
            sideActionName={sideActionName}
            scope={hsEntrySummaryScope}
            onScopeChange={setHsEntrySummaryScope}
            busy={busy}
            poolSelected={selectedPoolId !== null}
            onBack={() => setStep('menu')}
            onPreview={() => void runOpenPotEntrySummary('high_set', hsEntrySummaryScope)}
          />
        )}

        {step === 'high_set_options' && (
          <HighSetReportOptions
            listMode={hsListMode}
            onListModeChange={setHsListMode}
            busy={busy}
            canPreview={selectedPoolId !== null}
            onBack={() => setStep('menu')}
            onPreview={() => void runHighSetReport()}
          />
        )}

        {step === 'eliminator_entry_summary_options' && (
          <EliminatorEntrySummaryOptions
            sideActionName={sideActionName}
            scope={elimEntrySummaryScope}
            onScopeChange={setElimEntrySummaryScope}
            busy={busy}
            poolSelected={selectedPoolId !== null}
            onBack={() => setStep('menu')}
            onPreview={() => void runOpenPotEntrySummary('eliminator', elimEntrySummaryScope)}
          />
        )}

        {step === 'eliminator_options' && (
          <EliminatorReportOptions
            displayMode={elimDisplayMode}
            onDisplayModeChange={setElimDisplayMode}
            columnsAvailable={elimColumnsAvailable}
            gameCount={elimGameCount}
            busy={busy}
            canPreview={
              selectedPoolId !== null && elimOptionsPoolId === selectedPoolId
            }
            onBack={() => setStep('menu')}
            onPreview={() => void runEliminatorReport()}
          />
        )}

        {(step === 'mystery_doubles_entry_summary_options' ||
          step === 'mystery_doubles_options') && (
          <MysteryDoublesReportFlow
            step={step}
            sideActionName={sideActionName}
            selectedPoolId={selectedPoolId}
            entrySummaryScope={mdEntrySummaryScope}
            onEntrySummaryScopeChange={setMdEntrySummaryScope}
            requireContextIds={requireContextIds}
            requirePoolSelection={requirePoolSelection}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setPreviewDoc={setPreviewDoc}
            onBack={() => setStep('menu')}
          />
        )}

        {(step === 'mystery_game_entry_summary_options' ||
          step === 'mystery_game_options') && (
          <MysteryGameReportFlow
            step={step}
            sideActionName={sideActionName}
            selectedPoolId={selectedPoolId}
            entrySummaryScope={mgEntrySummaryScope}
            onEntrySummaryScopeChange={setMgEntrySummaryScope}
            requireContextIds={requireContextIds}
            requirePoolSelection={requirePoolSelection}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setPreviewDoc={setPreviewDoc}
            onBack={() => setStep('menu')}
          />
        )}

        {(step === 'love_doubles_entry_summary_options' ||
          step === 'love_doubles_options' ||
          step === 'alibi_doubles_entry_summary_options' ||
          step === 'alibi_doubles_options' ||
          step === 'alibi_doubles_signup_slips_options') && (
          <LiveDoublesReportSteps
            step={step}
            sideActionName={sideActionName}
            selectedPoolId={selectedPoolId}
            loveEntrySummaryScope={ldEntrySummaryScope}
            alibiEntrySummaryScope={adEntrySummaryScope}
            onLoveEntrySummaryScopeChange={setLdEntrySummaryScope}
            onAlibiEntrySummaryScopeChange={setAdEntrySummaryScope}
            requireContextIds={requireContextIds}
            requirePoolSelection={requirePoolSelection}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setPreviewDoc={setPreviewDoc}
            onBack={() => setStep('menu')}
          />
        )}

        {step === 'payout_options' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Cash-out sheet with a column per side action, Owed, and signature. Optionally include
              Entered (fees billed) and Collected (fees paid).
            </p>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-text">Rows</legend>
              <label className="flex items-start gap-2 text-sm text-text">
                <input
                  type="radio"
                  name="payout-group-by"
                  checked={payoutGroupBy === 'bowler'}
                  onChange={() => setPayoutGroupBy('bowler')}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Alphabetical</span>
                  <span className="block text-text-muted text-xs">
                    Teams as their own list (A–Z), then bowlers as a second list
                    (A–Z). Team pots never intermingle with individual payouts.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-text">
                <input
                  type="radio"
                  name="payout-group-by"
                  checked={payoutGroupBy === 'team'}
                  onChange={() => setPayoutGroupBy('team')}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Group by team</span>
                  <span className="block text-text-muted text-xs">
                    Team name as a header, bowlers listed underneath. Team-only
                    payouts (including team brackets) stay on the team line.
                  </span>
                </span>
              </label>
              {payoutGroupBy === 'team' && (
                <label className="flex items-start gap-2 text-sm text-text pl-6">
                  <input
                    type="checkbox"
                    checked={payoutTeamHeaderPayouts}
                    onChange={(e) => setPayoutTeamHeaderPayouts(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Show team payouts on the header</span>
                    <span className="block text-text-muted text-xs">
                      On: Team 1 shows its team-pot cash (for example $200). Off:
                      the team line is a name header only.
                    </span>
                  </span>
                </label>
              )}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-text">Optional columns</legend>
              <label className="flex items-start gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={payoutIncludeEntered}
                  onChange={(e) => setPayoutIncludeEntered(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Entered</span>
                  <span className="block text-text-muted text-xs">
                    Total side-action fees billed for this line (team pots on
                    team rows, individual pots on bowler rows).
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={payoutIncludeCollected}
                  onChange={(e) => setPayoutIncludeCollected(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Collected</span>
                  <span className="block text-text-muted text-xs">
                    Total side-action fees marked paid (recorded on bowler
                    lines).
                  </span>
                </span>
              </label>
            </fieldset>
            <div className="flex justify-end gap-2">
              <Button
                variant="lightbackground"
                size="small"
                onClick={() => setStep('menu')}
                disabled={busy}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={() => void runPayoutReport()}
                disabled={busy}
              >
                {busy ? 'Building…' : 'Preview'}
              </Button>
            </div>
          </div>
        )}

        {step === 'entry_summary_options' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Snapshot of entries, pots, unplaced refunds, and pot-structured money (not live
              bowler win totals).
            </p>
            <EntrySummaryScopeField
              name="entry-summary-scope"
              sideActionName={sideActionName}
              thisLabel="This bracket only"
              allTypeLabel="All brackets"
              allTypeDescription="Pool every active bracket-type side action on this event."
              scope={entrySummaryScope}
              onScopeChange={setEntrySummaryScope}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="lightbackground"
                size="small"
                onClick={() => setStep('menu')}
                disabled={busy}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={() => void runEntrySummary()}
                disabled={
                  busy || !entrySummaryCanPreview(entrySummaryScope, selectedPoolId !== null)
                }
              >
                {busy ? 'Building…' : 'Preview'}
              </Button>
            </div>
          </div>
        )}

        {step === 'signup_options' && (
          <SignupSheetOptions
            signupMode={signupMode}
            onSignupModeChange={setSignupMode}
            entryCells={entryCells}
            onEntryCellsChange={setEntryCells}
            blankPages={blankPages}
            onBlankPagesChange={setBlankPages}
            busy={busy}
            onBack={() => setStep('menu')}
            onPreview={() => void runSignupSheet()}
          />
        )}
      </Modal>

      <SideActionReportPreviewModal
        isOpen={previewDoc != null}
        document={previewDoc}
        onClose={() => {
          setPreviewDoc(null);
        }}
      />
    </>
  );
};

export default SideActionReportsMenuModal;
