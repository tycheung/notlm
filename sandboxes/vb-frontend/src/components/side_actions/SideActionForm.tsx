import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  SideActionType, 
  CreateSideActionRequest, 
  BracketConfig,
  HighGameConfig,
  HighSetConfig,
  EliminatorConfig,
  MysteryDoublesConfig,
  MysteryGameConfig,
  LoveDoublesConfig,
  AlibiDoublesConfig,
  SideActionSquadScopeMode,
} from '../../types/side_action';
import Input from '../common/Input';
import Button from '../common/Button';
import Card from '../common/Card';
import Alert from '../common/Alert';
import BracketConfigForm from './BracketConfigForm';
import HighGameConfigForm from './HighGameConfigForm';
import HighSetConfigForm from './HighSetConfigForm';
import EliminatorConfigForm from './EliminatorConfigForm';
import MysteryDoublesConfigForm from '../../features/side-actions/mystery-doubles/MysteryDoublesConfigForm';
import MysteryGameConfigForm from '../../features/side-actions/mystery-game/MysteryGameConfigForm';
import LoveDoublesConfigForm from '../../features/side-actions/love-doubles/LoveDoublesConfigForm';
import AlibiDoublesConfigForm from '../../features/side-actions/alibi-doubles/AlibiDoublesConfigForm';
import FeesAndPrizesForm from './FeesAndPrizesForm';
import SideActionTemplateControls from './SideActionTemplateControls';
import Label from '../common/Label';
import type { SideActionTemplateFormSnapshot } from '../../utils/sideActionTemplatePayload';
import {
  saveSideActionDraft,
  SideActionFormPersistedDraft,
} from '../../utils/sideActionDraftStorage';
import {
  buildDefaultCreateSideActionFields,
  defaultByePrizeDistributionForBracket,
  defaultPrizeDistributionForSideAction,
  defaultTypeConfigForSideAction,
  seedBracketTypeConfig,
} from '../../constants/sideActionDefaults';
import { useOpenPotFinancialBindings } from './useOpenPotFinancialBindings';
import { formatSideActionType } from '../../utils/sideActionDisplay';
import { eventHasBonusPinRounds } from '../../utils/sideActionBonusNotice';
import { eventHasBakerRounds } from '../../utils/roundGameScoring';
import { EventsAPI } from '../../api/events';
import { getErrorMessage } from '../../api/apiErrors';
import { getMaxBracketPayoutSpots, placeSpotCountFromDistribution } from '../../utils/sideActionPayouts';
import type { EventHandicapDefaults } from './EventSideActionsPanel';
import { SquadsAPI } from '../../api/squads';
import {
  eventSquadQueryKeys,
  ScopeSummaryBanner,
  SquadScopeSection,
} from '../../features/side-actions/shared';

type HouseCutType = 'percentage' | 'dollars_per_entry' | 'amount';
type PrizeType = 'percentage' | 'amount' | 'dollars_per_entry';

const normalizeHouseCutType = (value: string | undefined): HouseCutType =>
  value === 'percentage' || value === 'dollars_per_entry' || value === 'amount'
    ? value
    : 'amount';

const normalizePrizeType = (value: string | undefined): PrizeType =>
  value === 'percentage' || value === 'dollars_per_entry' || value === 'amount'
    ? value
    : 'amount';

interface SideActionFormProps {
  tournamentId: number;
  eventId?: number;
  eventGameCount?: number;
  entryCount?: number;
  onSubmit: (data: CreateSideActionRequest) => Promise<void>;
  initialData?: Partial<CreateSideActionRequest>;
  isUpdate?: boolean;
  eventHandicap?: EventHandicapDefaults;
  /** When set, type is fixed and the type selector is hidden. */
  fixedSideActionType?: SideActionType;
  /** Restored from sessionStorage when reopening the modal */
  restoredDraft?: SideActionFormPersistedDraft | null;
  /** When set, debounce-save draft for create or edit */
  draftPersistence?: { mode: 'create' } | { mode: 'edit'; sideActionId: number };
  /** Team pots require a team event. Hidden on singles. */
  allowTeamEntry?: boolean;
}

const SideActionForm: React.FC<SideActionFormProps> = ({
  tournamentId,
  eventId,
  eventGameCount = 3,
  entryCount = 0,
  onSubmit,
  initialData,
  isUpdate = false,
  fixedSideActionType,
  restoredDraft,
  draftPersistence,
  eventHandicap,
  allowTeamEntry = true,
}) => {
  const d = restoredDraft;
  const resolvedType =
    fixedSideActionType ??
    d?.sideActionType ??
    initialData?.side_action_type ??
    SideActionType.BRACKET;
  const defaults = buildDefaultCreateSideActionFields(resolvedType);
  // Common form fields
  const [name, setName] = useState(d?.name ?? initialData?.name ?? '');
  const [description, setDescription] = useState(d?.description ?? initialData?.description ?? '');
  const [sideActionType, setSideActionType] = useState<SideActionType>(resolvedType);
  const [entryFee, setEntryFee] = useState(d?.entryFee ?? initialData?.entry_fee ?? defaults.entry_fee);
  const [maxParticipants, setMaxParticipants] = useState(
    d?.maxParticipants ?? initialData?.max_participants ?? defaults.max_participants
  );
  const [squadScopeMode, setSquadScopeMode] =
    useState<SideActionSquadScopeMode>(
      d?.squadScopeMode ?? initialData?.squad_scope_mode ?? 'all'
    );
  const [selectedSquadIds, setSelectedSquadIds] = useState<number[]>(
    d?.selectedSquadIds ?? initialData?.selected_squad_ids ?? []
  );
  const resolvedEventId = eventId ?? initialData?.event_id;
  const { data: eventSquads = [], isLoading: areSquadsLoading } = useQuery({
    queryKey: eventSquadQueryKeys.list(resolvedEventId ?? 0),
    queryFn: () => SquadsAPI.getAllEventSquads(resolvedEventId as number),
    enabled: !!resolvedEventId,
  });
  const { data: eventWithRounds } = useQuery({
    queryKey: ['sideActionEventWithRounds', resolvedEventId],
    queryFn: () => EventsAPI.getEventWithRounds(resolvedEventId as number),
    enabled: !!resolvedEventId,
    staleTime: 60_000,
  });
  const showBonusPinsNote = useMemo(
    () => eventHasBonusPinRounds(eventWithRounds?.rounds),
    [eventWithRounds?.rounds]
  );
  const preferTeamEntry = useMemo(
    () => eventHasBakerRounds(eventWithRounds?.rounds),
    [eventWithRounds?.rounds]
  );
  
  // Type-specific configuration state
  const [typeConfig, setTypeConfig] = useState<Record<string, unknown>>(() => {
    const seededDefault = defaultTypeConfigForSideAction(
      resolvedType,
      eventHandicap,
      eventGameCount
    );
    const base = (d?.typeConfig ?? initialData?.type_config ?? seededDefault) as Record<
      string,
      unknown
    >;
    return resolvedType === SideActionType.BRACKET
      ? seedBracketTypeConfig(base, defaults.max_participants)
      : base;
  });
  const canonicalGameNumbers = useMemo(() => {
    const configured = typeConfig.game_numbers;
    if (Array.isArray(configured) && configured.length) {
      return [...new Set(configured.map(Number))]
        .filter(
          (gameNumber) =>
            Number.isInteger(gameNumber) &&
            gameNumber >= 1 &&
            gameNumber <= Math.max(1, eventGameCount)
        )
        .sort((left, right) => left - right);
    }
    return [];
  }, [eventGameCount, typeConfig.game_numbers]);
  
  // Fees and prizes state
  const [houseCutPercentage, setHouseCutPercentage] = useState(
    d?.houseCutPercentage ??
      initialData?.house_cut_percentage ??
      defaults.house_cut_percentage
  );
  const [houseCutAmount, setHouseCutAmount] = useState(
    d?.houseCutAmount ?? initialData?.house_cut_amount ?? defaults.house_cut_amount
  );
  const [houseCutType, setHouseCutType] = useState<HouseCutType>(
    normalizeHouseCutType(
      d?.houseCutType ?? initialData?.house_cut_type ?? defaults.house_cut_type
    )
  );
  const [prizeDistribution, setPrizeDistribution] = useState<Record<string, number>>(
    d?.prizeDistribution ??
      initialData?.prize_distribution ??
      defaultPrizeDistributionForSideAction(resolvedType, defaults.max_participants)
  );
  const [prizeType, setPrizeType] = useState<PrizeType>(
    normalizePrizeType(d?.prizeType ?? initialData?.prize_type ?? defaults.prize_type)
  );
  
  // Error and loading states
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevSideActionTypeRef = useRef<SideActionType | null>(null);

  const getDefaultConfig = useCallback(
    (type: SideActionType): Record<string, unknown> => {
      const base = defaultTypeConfigForSideAction(type, eventHandicap, eventGameCount);
      if (
        type === SideActionType.MYSTERY_GAME &&
        allowTeamEntry &&
        preferTeamEntry
      ) {
        return { ...base, entry_unit: 'team' };
      }
      return base;
    },
    [allowTeamEntry, eventGameCount, eventHandicap, preferTeamEntry]
  );

  // Reset type config only when user changes type (not on mount — preserves initialData / draft)
  useEffect(() => {
    if (prevSideActionTypeRef.current === null) {
      prevSideActionTypeRef.current = sideActionType;
      return;
    }
    if (prevSideActionTypeRef.current !== sideActionType) {
      prevSideActionTypeRef.current = sideActionType;
      setTypeConfig(getDefaultConfig(sideActionType));
    }
  }, [getDefaultConfig, sideActionType]);

  useEffect(() => {
    if (fixedSideActionType) {
      setSideActionType(fixedSideActionType);
    }
  }, [fixedSideActionType]);

  useEffect(() => {
    if (sideActionType !== SideActionType.BRACKET) return;
    const spots = getMaxBracketPayoutSpots(maxParticipants);
    // Ignore metadata keys like ``fee`` — including them was resetting saved prizes
    // every time FeesAndPrizesForm synced the expenses line into prize_distribution.
    if (placeSpotCountFromDistribution(prizeDistribution) === spots) return;
    setPrizeDistribution(
      defaultPrizeDistributionForSideAction(sideActionType, maxParticipants, entryFee)
    );
  }, [entryFee, maxParticipants, prizeDistribution, sideActionType]);

  // Keep bye pot place-count aligned when pot size changes (preserve fee / amounts when possible).
  useEffect(() => {
    if (sideActionType !== SideActionType.BRACKET) return;
    const spots = getMaxBracketPayoutSpots(maxParticipants);
    setTypeConfig((previous) => {
      const bye = (previous.bye_prize_distribution || {}) as Record<string, number>;
      if (placeSpotCountFromDistribution(bye) === spots) return previous;
      return {
        ...previous,
        bye_prize_distribution: defaultByePrizeDistributionForBracket(maxParticipants),
      };
    });
  }, [maxParticipants, sideActionType]);

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftPersistence || !resolvedEventId) return;
    const key: number | 'create' =
      draftPersistence.mode === 'create' ? 'create' : draftPersistence.sideActionId;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const payload: SideActionFormPersistedDraft = {
        v: 2,
        name,
        description,
        sideActionType,
        entryFee,
        maxParticipants,
        squadScopeMode,
        selectedSquadIds,
        poolOverrides: {},
        typeConfig,
        houseCutPercentage,
        houseCutAmount,
        houseCutType,
        prizeDistribution,
        prizeType,
      };
      saveSideActionDraft(tournamentId, resolvedEventId, key, payload);
    }, 400);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [
    draftPersistence,
    tournamentId,
    resolvedEventId,
    name,
    description,
    sideActionType,
    entryFee,
    maxParticipants,
    squadScopeMode,
    selectedSquadIds,
    typeConfig,
    houseCutPercentage,
    houseCutAmount,
    houseCutType,
    prizeDistribution,
    prizeType,
  ]);
  
  // Handle type config changes from child components
  const handleTypeConfigChange = useCallback((newConfig: object) => {
    setTypeConfig((previous) => ({ ...previous, ...newConfig }));
  }, []);

  const handlePlaceAmountsChange = useCallback((amounts: number[]) => {
    const distribution: Record<string, number> = {};
    amounts.forEach((value, index) => {
      distribution[String(index + 1)] = value;
    });
    setPrizeDistribution(distribution);
    setPrizeType('amount');
  }, []);

  const openPotFinancials = useOpenPotFinancialBindings({
    houseCutType,
    setHouseCutType,
    houseCutPercentage,
    setHouseCutPercentage,
    houseCutAmount,
    setHouseCutAmount,
    prizeDistribution,
    onPlaceAmountsChange: handlePlaceAmountsChange,
  });

  const getTemplateSnapshot = useCallback((): SideActionTemplateFormSnapshot => {
    return {
      name,
      description,
      entryFee,
      maxParticipants,
      houseCutPercentage,
      houseCutAmount,
      houseCutType,
      prizeDistribution,
      prizeType,
      gameNumbers: canonicalGameNumbers,
      typeConfig,
    };
  }, [
    name,
    description,
    entryFee,
    maxParticipants,
    houseCutPercentage,
    houseCutAmount,
    houseCutType,
    prizeDistribution,
    prizeType,
    canonicalGameNumbers,
    typeConfig,
  ]);

  const applyTemplateFields = useCallback(
    (fields: Partial<SideActionTemplateFormSnapshot>) => {
      if (fields.name != null) setName(fields.name);
      if (fields.description != null) setDescription(fields.description);
      if (fields.entryFee != null) setEntryFee(fields.entryFee);
      if (fields.maxParticipants != null && fields.maxParticipants > 0) {
        setMaxParticipants(fields.maxParticipants);
      }
      if (fields.houseCutPercentage != null) {
        setHouseCutPercentage(fields.houseCutPercentage);
      }
      if (fields.houseCutAmount !== undefined) {
        setHouseCutAmount(fields.houseCutAmount);
      }
      if (fields.houseCutType != null) setHouseCutType(fields.houseCutType);
      if (fields.prizeDistribution != null) {
        setPrizeDistribution(fields.prizeDistribution);
      }
      if (fields.prizeType != null) setPrizeType(fields.prizeType);
      if (fields.typeConfig != null) {
        setTypeConfig((prev) => ({
          ...prev,
          ...fields.typeConfig,
          game_numbers:
            fields.gameNumbers ??
            fields.typeConfig?.game_numbers ??
            prev.game_numbers,
        }));
      } else if (fields.gameNumbers != null) {
        setTypeConfig((prev) => ({ ...prev, game_numbers: fields.gameNumbers }));
      }
    },
    []
  );

  const handlePrizeDistributionChange = (newDistribution: Record<string, number>) => {
    setPrizeDistribution(newDistribution);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError('');
      if (!resolvedEventId) {
        throw new Error('An event is required for every side action.');
      }
      if (squadScopeMode === 'selected' && !selectedSquadIds.length) {
        throw new Error('Select at least one squad.');
      }
      if (!canonicalGameNumbers.length) {
        throw new Error('Select at least one game.');
      }
      
      const isHighGame = sideActionType === SideActionType.HIGH_GAME;
      const isHighSet = sideActionType === SideActionType.HIGH_SET;
      const isEliminator = sideActionType === SideActionType.ELIMINATOR;
      const isMysteryDoubles = sideActionType === SideActionType.MYSTERY_DOUBLES;
      const isMysteryGame = sideActionType === SideActionType.MYSTERY_GAME;
      const isLoveDoubles = sideActionType === SideActionType.LOVE_DOUBLES;
      const isAlibiDoubles = sideActionType === SideActionType.ALIBI_DOUBLES;
      const isBracket = sideActionType === SideActionType.BRACKET;
      if (isBracket && canonicalGameNumbers.length !== 3) {
        throw new Error('Select exactly 3 bracket round games.');
      }
      if (isMysteryDoubles && canonicalGameNumbers.length !== 1) {
        throw new Error('Mystery Doubles requires exactly one game.');
      }
      if (
        isMysteryGame &&
        (typeConfig as MysteryGameConfig).game_scope !== 'all_games_pool' &&
        canonicalGameNumbers.length !== 1
      ) {
        throw new Error('Mystery Game single-game mode requires exactly one game.');
      }
      const isEventOpenPot =
        isHighGame ||
        isHighSet ||
        isEliminator ||
        isMysteryDoubles ||
        isMysteryGame ||
        isLoveDoubles ||
        isAlibiDoubles;
      const isPerEntryCut = houseCutType === 'dollars_per_entry';
      // Shared settings apply to every enabled squad pool. Different games/fees/scoring
      // should be a separate side action rather than per-squad overrides.
      const formData: CreateSideActionRequest = {
        name,
        tournament_id: tournamentId,
        event_id: resolvedEventId,
        side_action_type: fixedSideActionType ?? sideActionType,
        description,
        entry_fee: entryFee,
        // Open pots (HG / High Series / Eliminator) have no pot size cap.
        max_participants: isEventOpenPot ? 10000 : maxParticipants,
        house_cut_percentage: isPerEntryCut
          ? houseCutPercentage || houseCutAmount || 0
          : houseCutType === 'amount'
            ? 0
            : houseCutPercentage,
        house_cut_amount: isPerEntryCut ? null : houseCutAmount,
        house_cut_type: houseCutType,
        game_numbers: canonicalGameNumbers,
        squad_scope_mode: squadScopeMode,
        selected_squad_ids:
          squadScopeMode === 'selected' ? selectedSquadIds : [],
        pool_overrides: {},
        check_in_required: false,
        type_config: allowTeamEntry
          ? typeConfig
          : { ...typeConfig, entry_unit: 'bowler' },
        prize_distribution: prizeDistribution,
        prize_type: prizeType,
        custom_payout_structure: null,
      };
      
      await onSubmit(formData);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save side action'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render type-specific configuration form
  const renderTypeConfigForm = () => {
    switch (sideActionType) {
      case SideActionType.BRACKET:
        return (
          <BracketConfigForm
            config={typeConfig as unknown as BracketConfig}
            onChange={handleTypeConfigChange}
            eventHandicap={eventHandicap}
            eventGameCount={eventGameCount}
            allowTeamEntry={allowTeamEntry}
          />
        );
      case SideActionType.HIGH_GAME:
        return (
          <HighGameConfigForm
            config={typeConfig as HighGameConfig}
            onChange={handleTypeConfigChange}
            eventHandicap={eventHandicap}
            eventGameCount={eventGameCount}
            allowTeamEntry={allowTeamEntry}
            entryFee={entryFee}
            onEntryFeeChange={setEntryFee}
            entryCount={entryCount}
            {...openPotFinancials}
          />
        );
      case SideActionType.HIGH_SET:
        return (
          <HighSetConfigForm
            config={typeConfig as HighSetConfig}
            onChange={handleTypeConfigChange}
            eventHandicap={eventHandicap}
            eventGameCount={eventGameCount}
            allowTeamEntry={allowTeamEntry}
            entryFee={entryFee}
            onEntryFeeChange={setEntryFee}
            entryCount={entryCount}
            {...openPotFinancials}
          />
        );
      case SideActionType.ELIMINATOR:
        return (
          <EliminatorConfigForm
            config={typeConfig as EliminatorConfig}
            onChange={handleTypeConfigChange}
            eventHandicap={eventHandicap}
            eventGameCount={eventGameCount}
            allowTeamEntry={allowTeamEntry}
            entryFee={entryFee}
            onEntryFeeChange={setEntryFee}
            entryCount={entryCount}
            {...openPotFinancials}
          />
        );
      case SideActionType.MYSTERY_DOUBLES:
        return (
          <MysteryDoublesConfigForm
            config={typeConfig as MysteryDoublesConfig}
            onChange={handleTypeConfigChange}
            eventHandicap={eventHandicap}
            eventGameCount={eventGameCount}
            entryFee={entryFee}
            onEntryFeeChange={setEntryFee}
            entryCount={entryCount}
            {...openPotFinancials}
          />
        );
      case SideActionType.MYSTERY_GAME:
        return (
          <MysteryGameConfigForm
            config={typeConfig as MysteryGameConfig}
            onChange={handleTypeConfigChange}
            eventHandicap={eventHandicap}
            eventGameCount={eventGameCount}
            allowTeamEntry={allowTeamEntry}
            preferTeamEntry={preferTeamEntry}
            entryFee={entryFee}
            onEntryFeeChange={setEntryFee}
            entryCount={entryCount}
            {...openPotFinancials}
          />
        );
      case SideActionType.LOVE_DOUBLES:
        return (
          <LoveDoublesConfigForm
            config={typeConfig as LoveDoublesConfig}
            onChange={handleTypeConfigChange}
            eventHandicap={eventHandicap}
            eventGameCount={eventGameCount}
            entryFee={entryFee}
            onEntryFeeChange={setEntryFee}
            entryCount={entryCount}
            {...openPotFinancials}
          />
        );
      case SideActionType.ALIBI_DOUBLES:
        return (
          <AlibiDoublesConfigForm
            config={typeConfig as AlibiDoublesConfig}
            onChange={handleTypeConfigChange}
            eventHandicap={eventHandicap}
            eventGameCount={eventGameCount}
            entryFee={entryFee}
            onEntryFeeChange={setEntryFee}
            entryCount={entryCount}
            {...openPotFinancials}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert
          variant="error"
          message={error}
          onDismiss={() => setError('')}
          className="mb-4"
        />
      )}

      <SideActionTemplateControls
        sideActionType={sideActionType}
        eventGameCount={eventGameCount}
        getSnapshot={getTemplateSnapshot}
        onApply={applyTemplateFields}
      />
      
      <Card title="Basic Information" className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Side Action Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />

          {fixedSideActionType ? (
            <div className="flex flex-col">
              <Label htmlFor="sideActionType">Side Action Type</Label>
              <p
                id="sideActionType"
                className="border border-border rounded-md bg-surface-light px-3 py-2 text-sm text-text capitalize"
              >
                {formatSideActionType(fixedSideActionType)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              <Label htmlFor="sideActionType" required>
                Side Action Type
              </Label>
              <select
                id="sideActionType"
                name="sideActionType"
                value={sideActionType}
                onChange={(e) => setSideActionType(e.target.value as SideActionType)}
                className="border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary p-2"
                disabled={isUpdate}
              >
                <option value={SideActionType.BRACKET}>Bracket</option>
                <option value={SideActionType.HIGH_GAME}>High Game</option>
                <option value={SideActionType.HIGH_SET}>High Series</option>
                <option value={SideActionType.ELIMINATOR}>Eliminator</option>
                <option value={SideActionType.MYSTERY_DOUBLES}>Mystery Doubles</option>
                <option value={SideActionType.MYSTERY_GAME}>Mystery Game</option>
                <option value={SideActionType.LOVE_DOUBLES}>Love Doubles</option>
                <option value={SideActionType.ALIBI_DOUBLES}>Alibi Doubles</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-primary">
            Description
          </label>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-surface text-text rounded-md border border-border focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/50 transition-colors duration-200"
          />
        </div>
        
        {sideActionType === SideActionType.BRACKET && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Input
            label="Max Participants (per pot)"
            name="maxParticipants"
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
            min={8}
            max={32}
            step={8}
            required
            fullWidth
            helperText="Seating is always 8 per pot. Choose 16 or 32 to unlock up to 4 prize places."
          />
        </div>
        )}
      </Card>

      <Card title="Event and Squad Scope" className="mb-4">
        <div className="space-y-4">
          <SquadScopeSection
            squads={eventSquads}
            scopeMode={squadScopeMode}
            selectedSquadIds={selectedSquadIds}
            onScopeModeChange={setSquadScopeMode}
            onSelectedSquadIdsChange={setSelectedSquadIds}
            isLoading={areSquadsLoading}
          />
          <ScopeSummaryBanner
            scopeMode={squadScopeMode}
            squads={eventSquads}
            selectedSquadIds={selectedSquadIds}
          />
          <p className="text-xs text-text-muted">
            Every included squad gets the same games, fees, and scoring settings.
            If one squad needs different settings, create a separate side action
            for that squad (or those squads) instead.
          </p>
        </div>
      </Card>
      
      {/* Type-specific configuration */}
      <Card
        title={`${
          sideActionType === SideActionType.HIGH_SET
            ? 'High Series'
            : sideActionType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        } Configuration`}
        className="mb-4"
      >
        {showBonusPinsNote && (
          <Alert
            variant="info"
            message="This event includes bonus-pin scoring. Side action results do not use bonus pins; they use only the selected game scores, plus handicap only when that side action is configured for handicap."
            className="mb-4"
          />
        )}
        {renderTypeConfigForm()}
      </Card>
      
      {/* Fees and Prizes (open pots own fee / expenses / places in config card) */}
      {sideActionType !== SideActionType.HIGH_GAME &&
        sideActionType !== SideActionType.HIGH_SET &&
        sideActionType !== SideActionType.ELIMINATOR &&
        sideActionType !== SideActionType.MYSTERY_DOUBLES &&
        sideActionType !== SideActionType.MYSTERY_GAME &&
        sideActionType !== SideActionType.LOVE_DOUBLES &&
        sideActionType !== SideActionType.ALIBI_DOUBLES && (
      <FeesAndPrizesForm
        entryFee={entryFee}
        onEntryFeeChange={(value) => setEntryFee(value)}
        houseCutPercentage={houseCutPercentage}
        onHouseCutPercentageChange={(value) => setHouseCutPercentage(value)}
        houseCutAmount={houseCutAmount}
        onHouseCutAmountChange={(value) => setHouseCutAmount(value)}
        houseCutType={houseCutType}
        onHouseCutTypeChange={setHouseCutType}
        prizeDistribution={prizeDistribution}
        prizeType={prizeType}
        onPrizeTypeChange={setPrizeType}
        onPrizeDistributionChange={handlePrizeDistributionChange}
        byePrizeDistribution={
          ((typeConfig as Record<string, unknown>).bye_prize_distribution as
            | Record<string, number>
            | undefined) || undefined
        }
        onByePrizeDistributionChange={(distribution) => {
          setTypeConfig((previous) => ({
            ...previous,
            bye_prize_distribution: distribution,
          }));
        }}
        maxParticipants={maxParticipants}
        sideActionType={sideActionType}
      />
      )}
      
      <div className="flex justify-end mt-4 gap-3 flex-col sm:flex-row sm:items-center">
        {error && (
          <p className="text-sm text-red-300 sm:mr-auto sm:max-w-md">{error}</p>
        )}
        <Button
          type="submit"
          variant="darkbackground"
          isLoading={isSubmitting}
          disabled={isSubmitting || !name.trim()}
        >
          {isUpdate ? 'Update Side Action' : 'Create Side Action'}
        </Button>
      </div>
    </form>
  );
};

export default SideActionForm; 
