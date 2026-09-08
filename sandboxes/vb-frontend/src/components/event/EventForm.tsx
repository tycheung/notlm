import React, { useState, useEffect, useRef } from 'react';
import {
  DuplicateCashingPolicy,
  EventCreate,
  EventFormat,
  EventRead,
  EventUpdate,
  TeamHandicapMethod,
  TeamScoringMethod,
} from '../../types/event';
import { TournamentRead } from '../../types/tournament';
import { useAuth } from '../../contexts/AuthContext';
import {
  EventCreateDraft,
  mergeEventCreateDraft,
} from '../../utils/eventCreateDraftStorage';
import { EventFormPersistedDraft } from '../../utils/eventFormDraftTypes';
import { mergeEventEditDraft } from '../../utils/eventEditDraftStorage';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import ErrorMessage from '../common/ErrorMessage';
import Select from '../common/Select';
import DatePicker from '../common/DatePicker';
import SectionTitle from '../common/SectionTitle';
import Label from '../common/Label';
import {
  getCurrentDateString,
  toLocalDateString,
  normalizeToNaiveDateTime,
  parseNaiveDateTimeToDate,
  toSameDayEndOfDayNaiveDateTime,
} from '../../utils/dateUtils';
import { getErrorMessage } from '../../api/apiErrors';
import { TdAccessAPI } from '../../api/tdAccess';
import ConfirmDialog from '../common/ConfirmDialog';

interface EventFormProps {
  initialData?: EventRead;
  tournamentId: number;
  tournament?: TournamentRead;
  onSubmit: (data: EventCreate | EventUpdate) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  isEdit?: boolean;
  /** When reopening create/edit, restore fields from sessionStorage. */
  restoredDraft?: EventCreateDraft | EventFormPersistedDraft | null;
  /** Create flow: debounce-save keyed by tournament. */
  draftPersistenceTournamentId?: number;
  /** Edit flow: debounce-save keyed by event. */
  draftPersistenceEventId?: number;
}

function calendarDayPart(isoOrYmd: string | undefined | null): string {
  const s = String(isoOrYmd ?? '').trim();
  if (!s) return getCurrentDateString();
  return s.includes('T') ? s.slice(0, 10) : s.slice(0, 10);
}

function createDefaultFormValues(
  initialData: EventRead | undefined,
  tournamentId: number,
  _tournament: TournamentRead | undefined,
  isEdit: boolean,
  userId: number | undefined
): EventCreate | EventUpdate {
  const isNew = !initialData;
  const startDay = initialData?.start_date
    ? calendarDayPart(initialData.start_date)
    : getCurrentDateString();
  const startNorm = normalizeToNaiveDateTime(startDay, false);
  const endNorm = initialData?.end_date
    ? normalizeToNaiveDateTime(calendarDayPart(initialData.end_date), true)
    : '';
  return {
    name: initialData?.name || '',
    tournament_id: tournamentId,
    start_date: startNorm,
    end_date: endNorm,
    handicap_base_score: initialData?.handicap_base_score ?? 200,
    handicap_percentage: initialData?.handicap_percentage ?? 90,
    entry_fee: initialData?.entry_fee ?? (isNew ? 0 : null),
    max_entries: initialData?.max_entries || null,
    description: initialData?.description || '',
    rules: initialData?.rules || '',
    allows_reentry: initialData?.allows_reentry || false,
    max_reentries: initialData?.max_reentries || null,
    reentry_fee: initialData?.reentry_fee || null,

    event_format: initialData?.event_format || EventFormat.SINGLES,
    team_size: initialData?.team_size || null,
    allow_individual_reentries: initialData?.allow_individual_reentries ?? true,
    allow_team_reentries: initialData?.allow_team_reentries ?? false,
    team_scoring_method: initialData?.team_scoring_method || null,
    // DYLG moved to per-round competition_method_config; keep event fields cleared.
    dylg_enabled: false,
    dylg_scope: null,
    team_handicap_method: initialData?.team_handicap_method || null,
    team_handicap_percentage: initialData?.team_handicap_percentage || null,
    team_handicap_base: initialData?.team_handicap_base || null,

    house_cut_percentage: initialData?.house_cut_percentage ?? (isNew ? 0 : 20.0),
    house_cut_amount: initialData?.house_cut_amount ?? null,
    house_cut_type: initialData?.house_cut_type || 'percentage',
    additional_prize_pool: initialData?.additional_prize_pool ?? null,
    lineage_fee_mode: initialData?.lineage_fee_mode || 'flat',
    lineage_per_game: initialData?.lineage_per_game ?? 0,
    lineage_amount: initialData?.lineage_amount ?? 0,
    lineage_billed_games: initialData?.lineage_billed_games ?? null,
    duplicate_cashing_policy:
      initialData?.duplicate_cashing_policy || DuplicateCashingPolicy.ALLOW_MULTIPLE,
    created_by: isEdit ? undefined : userId || null,
  };
}

/** Merge legacy draft shape (separate prize fields) into formValues for backward compatibility. */
function mergeLegacyDraftIntoFormValues(
  base: EventCreate | EventUpdate,
  draft: EventFormPersistedDraft | (EventCreateDraft & Record<string, unknown>)
): EventCreate | EventUpdate {
  const d = draft as EventFormPersistedDraft & {
    houseCutPercentage?: number;
    houseCutAmount?: number;
  };
  if (d.houseCutPercentage === undefined && d.houseCutAmount === undefined) {
    return { ...base, ...d.formValues };
  }
  return {
    ...base,
    ...d.formValues,
    house_cut_percentage: d.formValues?.house_cut_percentage ?? d.houseCutPercentage ?? base.house_cut_percentage,
    house_cut_amount: d.formValues?.house_cut_amount ?? d.houseCutAmount ?? base.house_cut_amount,
  };
}

/** When start is set but end is empty, default end to end-of-day on the same calendar day. */
function ensureEndDateWhenEmptyFromStart<T extends EventCreate | EventUpdate>(values: T): T {
  const start = String(values.start_date ?? '').trim();
  const end = String(values.end_date ?? '').trim();
  if (!start || end) return values;
  return {
    ...values,
    end_date: toSameDayEndOfDayNaiveDateTime(start),
  };
}

const EventForm: React.FC<EventFormProps> = ({
  initialData,
  tournamentId,
  tournament,
  onSubmit,
  isSubmitting,
  onCancel,
  isEdit = false,
  restoredDraft,
  draftPersistenceTournamentId,
  draftPersistenceEventId,
}) => {
  const { user } = useAuth();

  const [formValues, setFormValues] = useState<EventCreate | EventUpdate>(() => {
    const defaults = createDefaultFormValues(
      initialData,
      tournamentId,
      tournament,
      isEdit,
      user?.id
    );
    const merged = !restoredDraft
      ? defaults
      : mergeLegacyDraftIntoFormValues(defaults, restoredDraft);
    return ensureEndDateWhenEmptyFromStart(merged);
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [liftConfirmOpen, setLiftConfirmOpen] = useState(false);
  const [lifting, setLifting] = useState(false);
  const [participantCap, setParticipantCap] = useState(
    tournament?.unique_participant_cap ?? 500
  );
  const liftPasses = user?.billing?.passes?.large_cap_lift ?? 0;
  const canLiftCap = liftPasses > 0 && participantCap < 2000;

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const persistCreate = draftPersistenceTournamentId != null && !isEdit;
    const persistEdit = draftPersistenceEventId != null && isEdit;
    if (!persistCreate && !persistEdit) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      const payload = { formValues: { ...formValues } };
      if (persistEdit && draftPersistenceEventId != null) {
        mergeEventEditDraft(draftPersistenceEventId, payload);
      } else if (persistCreate && draftPersistenceTournamentId != null) {
        mergeEventCreateDraft(draftPersistenceTournamentId, payload);
      }
    }, 400);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [
    draftPersistenceTournamentId,
    draftPersistenceEventId,
    isEdit,
    formValues,
  ]);
  
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Special handling for checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormValues(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      const numValue = value === '' ? null : Number(value);
      setFormValues(prev => {
        const next: typeof prev = { ...prev, [name]: numValue };
        // Team events: mirror event handicap into team handicap fields
        if (prev.event_format === EventFormat.TEAMS) {
          if (name === 'handicap_base_score') {
            next.team_handicap_base = numValue;
          }
          if (name === 'handicap_percentage') {
            next.team_handicap_percentage = numValue;
          }
        }
        return next;
      });
      return;
    }
    
    // Handle all other inputs
    setFormValues(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle date changes — store naive day bounds: start 00:00:00, end 23:59:59 on chosen calendar days
  const handleDateChange = (date: Date | null, fieldName: string) => {
    if (!date) return;
    const ymd = toLocalDateString(date);

    if (fieldName === 'start_date') {
      const startNorm = normalizeToNaiveDateTime(ymd, false);
      setFormValues((prev) => {
        const endUnset = !String(prev.end_date ?? '').trim();
        if (endUnset) {
          return {
            ...prev,
            start_date: startNorm,
            end_date: normalizeToNaiveDateTime(ymd, true),
          };
        }
        return { ...prev, start_date: startNorm };
      });
      return;
    }

    if (fieldName === 'end_date') {
      const endNorm = normalizeToNaiveDateTime(ymd, true);
      setFormValues((prev) => ({ ...prev, end_date: endNorm }));
    }
  };
  
  // Toggle re-entry option
  const handleReentryToggle = (allow: boolean) => {
    setFormValues(prev => ({
      ...prev,
      allows_reentry: allow,
      // Reset related fields if turning off
      max_reentries: allow ? prev.max_reentries : null,
      reentry_fee: allow ? prev.reentry_fee : null
    }));
  };

  // Handle event format change
  const handleEventFormatChange = (format: EventFormat) => {
    setFormValues(prev => {
      const scratch = (prev.handicap_percentage ?? 0) === 0;
      return {
      ...prev,
      event_format: format,
      // Reset team-specific fields when switching to singles
      team_size: format === EventFormat.TEAMS ? (prev.team_size || 4) : null,
      team_scoring_method: format === EventFormat.TEAMS ? (prev.team_scoring_method || TeamScoringMethod.SUM_ALL) : null,
      team_handicap_method: format === EventFormat.TEAMS
        ? (scratch
            ? TeamHandicapMethod.SUM_INDIVIDUAL
            : (prev.team_handicap_method || TeamHandicapMethod.SUM_INDIVIDUAL))
        : null,
      team_handicap_percentage:
        format === EventFormat.TEAMS && !scratch
          ? (prev.team_handicap_percentage ?? prev.handicap_percentage ?? 90)
          : null,
      team_handicap_base:
        format === EventFormat.TEAMS && !scratch
          ? (prev.team_handicap_base ?? prev.handicap_base_score ?? 200)
          : null,
      dylg_enabled: false,
      dylg_scope: null,
    };
    });
  };

  const isScratchEvent = (formValues.handicap_percentage ?? 0) === 0;

  /** Event-wide scratch vs handicap. Side actions can still use their own handicap mode. */
  const handleEventScoringModeChange = (mode: 'scratch' | 'handicap') => {
    setFormValues((prev) => {
      if (mode === 'scratch') {
        return {
          ...prev,
          handicap_percentage: 0,
          // Keep team percentage/base null — backend rejects them unless
          // team_handicap_method is PERCENTAGE_OF_BASE.
          team_handicap_percentage: null,
          team_handicap_base: null,
          team_handicap_method:
            prev.event_format === EventFormat.TEAMS
              ? TeamHandicapMethod.SUM_INDIVIDUAL
              : null,
        };
      }
      const pct =
        prev.handicap_percentage && prev.handicap_percentage > 0
          ? prev.handicap_percentage
          : 90;
      const base = prev.handicap_base_score ?? 200;
      return {
        ...prev,
        handicap_percentage: pct,
        handicap_base_score: base,
        team_handicap_percentage:
          prev.event_format === EventFormat.TEAMS
            ? prev.team_handicap_percentage && prev.team_handicap_percentage > 0
              ? prev.team_handicap_percentage
              : pct
            : null,
        team_handicap_base:
          prev.event_format === EventFormat.TEAMS
            ? prev.team_handicap_base ?? base
            : null,
      };
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Basic validation
    if (!formValues.name) {
      setFormError('Event name is required');
      return;
    }
    
    if (!formValues.start_date) {
      setFormError('Start date is required');
      return;
    }
    
    if (!formValues.end_date) {
      setFormError('End date is required');
      return;
    }
    
    const startNorm = normalizeToNaiveDateTime(String(formValues.start_date), false);
    const endNorm = normalizeToNaiveDateTime(String(formValues.end_date), true);
    const startDate = parseNaiveDateTimeToDate(startNorm);
    const endDate = parseNaiveDateTimeToDate(endNorm);
    if (!startDate || !endDate || !(endDate.getTime() > startDate.getTime())) {
      setFormError('End date must be after start date');
      return;
    }

    // Team-specific validation
    if (formValues.event_format === EventFormat.TEAMS) {
      if (!formValues.team_size || formValues.team_size < 2) {
        setFormError('Team size must be at least 2 for team events');
        return;
      }
      
      if (!formValues.team_scoring_method) {
        setFormError('Team scoring method is required for team events');
        return;
      }
      
      if (!isScratchEvent && !formValues.team_handicap_method) {
        setFormError('Team handicap method is required for handicap team events');
        return;
      }
    }
    
    // Prepare submission data - filter out team handicap fields when not using percentage-based method
    const submissionData = {
      ...formValues,
      start_date: startNorm,
      end_date: endNorm,
      // DYLG is configured per round in the format wizard.
      dylg_enabled: false,
      dylg_scope: null,
    };

    if (isScratchEvent) {
      submissionData.handicap_percentage = 0;
      if (formValues.event_format === EventFormat.TEAMS) {
        // Scratch events still need a method for schema completeness, but
        // percentage/base fields are only valid with PERCENTAGE_OF_BASE.
        submissionData.team_handicap_method = TeamHandicapMethod.SUM_INDIVIDUAL;
        submissionData.team_handicap_percentage = null;
        submissionData.team_handicap_base = null;
      }
    } else if (formValues.team_handicap_method !== TeamHandicapMethod.PERCENTAGE_OF_BASE) {
      // Only include team handicap percentage and base when using percentage-based method
      submissionData.team_handicap_percentage = null;
      submissionData.team_handicap_base = null;
    }
    
    try {
      await onSubmit(submissionData);
    } catch (err: any) {
      console.error('Error submitting event:', err);
      setFormError(getErrorMessage(err, 'Failed to save event'));
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {formError && (
        <ErrorMessage
          message={formError}
          title="Event Configuration Error"
          onDismiss={() => setFormError(null)}
          className="mb-6"
        />
      )}
      
      <Card title="Event Details" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="col-span-2">
            <Input
              label="Event Name"
              name="name"
              value={formValues.name}
              onChange={handleChange}
              required
              fullWidth
              data-guide-id="guide-field-event-name"
            />
          </div>
          
          {/* Dates */}
          <div data-guide-id="guide-field-event-start">
            <label className="block mb-2 font-bold text-primary">
              Start Date
            </label>
            <DatePicker
              selected={formValues.start_date ? parseNaiveDateTimeToDate(normalizeToNaiveDateTime(String(formValues.start_date), false)) : null}
              onChange={(date: Date | null) => handleDateChange(date, 'start_date')}
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm"
            />
          </div>
          
          <div data-guide-id="guide-field-event-end">
            <label className="block mb-2 font-bold text-primary">
              End Date
            </label>
            <DatePicker
              selected={formValues.end_date ? parseNaiveDateTimeToDate(normalizeToNaiveDateTime(String(formValues.end_date), true)) : null}
              onChange={(date: Date | null) => handleDateChange(date, 'end_date')}
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm"
              minDate={formValues.start_date ? parseNaiveDateTimeToDate(normalizeToNaiveDateTime(String(formValues.start_date), false)) ?? undefined : undefined}
            />
          </div>
          
          {/* Event scoring: scratch vs handicap (side actions keep their own mode) */}
          <div>
            <label className="block mb-2 font-bold text-primary">
              Event Scoring *
            </label>
            <Select
              value={isScratchEvent ? 'scratch' : 'handicap'}
              onChange={(value) =>
                handleEventScoringModeChange(value as 'scratch' | 'handicap')
              }
              options={[
                { value: 'handicap', label: 'Handicap' },
                { value: 'scratch', label: 'Scratch' },
              ]}
            />
            <p className="text-sm text-text-muted mt-1">
              Applies to event standings and scoring. Side actions can still be
              handicap or scratch in their own setup.
            </p>
          </div>

          {!isScratchEvent && (
            <>
              <div>
                <Input
                  label="Handicap Base Score"
                  name="handicap_base_score"
                  type="number"
                  min={100}
                  max={300}
                  value={formValues.handicap_base_score}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Input
                  label="Handicap Percentage"
                  name="handicap_percentage"
                  type="number"
                  min={1}
                  max={100}
                  value={formValues.handicap_percentage}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}
          
          {/* Event Format */}
          <div>
            <label className="block mb-2 font-bold text-primary">
              Event Format *
            </label>
            <Select
              value={formValues.event_format?.toString() || EventFormat.SINGLES.toString()}
              onChange={(value) => handleEventFormatChange(value as EventFormat)}
              data-guide-id="guide-field-event-format"
              options={[
                { value: EventFormat.SINGLES.toString(), label: 'Singles Event' },
                { value: EventFormat.TEAMS.toString(), label: 'Team Event' }
              ]}
            />
          </div>

          {/* Maximum entries — informational vs tournament unique participant cap */}
          <div>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[12rem]">
                <Input
                  label={
                    formValues.event_format === EventFormat.TEAMS
                      ? 'Maximum Teams'
                      : 'Maximum Entries'
                  }
                  name="max_entries"
                  type="number"
                  min={1}
                  value={formValues.max_entries === null ? '' : formValues.max_entries}
                  onChange={handleChange}
                  placeholder={`Planning target (tournament max ${participantCap})`}
                />
              </div>
              <span
                title={
                  canLiftCap
                    ? undefined
                    : 'To upgrade max capacity, please purchase an upgrade pass in Manage Subscription'
                }
              >
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  disabled={!canLiftCap || lifting}
                  onClick={() => setLiftConfirmOpen(true)}
                >
                  Upgrade
                </Button>
              </span>
            </div>
            <p className="text-sm text-text-muted mt-1">
              Maximum of {participantCap} unique participants for this tournament
              (informational for this field; not enforced as a hard limit here).
              {formValues.event_format === EventFormat.TEAMS && formValues.team_size
                ? ` Teams planning: up to ${
                    formValues.max_entries
                      ? formValues.max_entries * formValues.team_size
                      : participantCap
                  } total bowlers.`
                : null}
            </p>
          </div>

          <ConfirmDialog
            isOpen={liftConfirmOpen}
            title="Upgrade capacity"
            message={`Are you sure? To extend the max capacity of this event from ${participantCap} to 2000 people, 1 upgrade pass will be consumed (${liftPasses} remaining).`}
            confirmText="I'm sure"
            cancelText="Cancel"
            onClose={() => setLiftConfirmOpen(false)}
            onConfirm={async () => {
              setLifting(true);
              try {
                const res = await TdAccessAPI.applyLargeCapLift(tournamentId);
                setParticipantCap(res.unique_participant_cap);
                setLiftConfirmOpen(false);
              } catch (err) {
                setFormError(getErrorMessage(err, 'Could not apply capacity upgrade.'));
                setLiftConfirmOpen(false);
              } finally {
                setLifting(false);
              }
            }}
          />

          {/* Team Configuration Section - appears directly under Event Format */}
          {formValues.event_format === EventFormat.TEAMS && (
            <div className="col-span-2">
              <Card title="Team Configuration" className="bg-surface-light border-l-4 border-primary mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team Size */}
                  <div>
                    <label className="block mb-2 font-bold text-primary">
                      Team Size *
                    </label>
                    <Select
                      value={formValues.team_size?.toString() || '4'}
                      onChange={(value) => {
                        setFormValues(prev => ({ ...prev, team_size: parseInt(value) }));
                      }}
                      options={[
                        { value: '2', label: '2 Players' },
                        { value: '3', label: '3 Players' },
                        { value: '4', label: '4 Players' },
                        { value: '5', label: '5 Players' },
                        { value: '6', label: '6 Players' },
                        { value: '7', label: '7 Players' },
                        { value: '8', label: '8 Players' }
                      ]}
                    />
                  </div>

                  {/* Team Scoring Method */}
                  <div>
                    <label className="block mb-2 font-bold text-primary">
                      Team Scoring Method *
                    </label>
                    <Select
                      value={formValues.team_scoring_method?.toString() || TeamScoringMethod.SUM_ALL.toString()}
                      onChange={(value) => {
                        setFormValues(prev => ({ ...prev, team_scoring_method: value as TeamScoringMethod }));
                      }}
                      options={[
                        { value: TeamScoringMethod.SUM_ALL.toString(), label: 'Sum All Players' },
                        { value: TeamScoringMethod.SUM_BEST_N.toString(), label: 'Sum Best N Players' }
                      ]}
                    />
                    <p className="text-sm text-text-muted mt-1">
                      How player scores combine into a team total. Baker vs regular games and DYLG are configured per round.
                    </p>
                  </div>

                  {/* Team Handicap Configuration — only when event is handicap */}
                  {!isScratchEvent && (
                  <div className="col-span-2">
                    <SectionTitle size="medium" className="mb-4">Team Handicap Configuration</SectionTitle>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Team Handicap Method */}
                      <div>
                        <label className="block mb-2 font-bold text-primary">
                          Handicap Method *
                        </label>
                        <Select
                          value={formValues.team_handicap_method?.toString() || TeamHandicapMethod.SUM_INDIVIDUAL.toString()}
                          onChange={(value) => {
                            setFormValues(prev => ({ ...prev, team_handicap_method: value as TeamHandicapMethod }));
                          }}
                          options={[
                            { value: TeamHandicapMethod.SUM_INDIVIDUAL.toString(), label: 'Sum Individual Handicaps' },
                            { value: TeamHandicapMethod.PERCENTAGE_OF_BASE.toString(), label: 'Percentage of Base Score' }
                          ]}
                        />
                      </div>

                      {/* Team Handicap Percentage */}
                      <div>
                        <Input
                          label="Team Handicap Percentage"
                          name="team_handicap_percentage"
                          type="number"
                          min={0}
                          max={100}
                          value={formValues.team_handicap_percentage === null ? '' : formValues.team_handicap_percentage}
                          onChange={handleChange}
                          placeholder="90"
                        />
                      </div>

                      {/* Team Handicap Base */}
                      <div>
                        <Input
                          label="Team Handicap Base Score"
                          name="team_handicap_base"
                          type="number"
                          min={100}
                          max={300}
                          value={formValues.team_handicap_base === null ? '' : formValues.team_handicap_base}
                          onChange={handleChange}
                          placeholder="200"
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Team Re-entry Options */}
                  <div className="col-span-2">
                    <SectionTitle size="medium" className="mb-4">Team Re-entry Options</SectionTitle>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center text-sm mb-0 cursor-pointer">
                          <input
                            type="checkbox"
                            name="allow_individual_reentries"
                            checked={formValues.allow_individual_reentries}
                            onChange={handleChange}
                            className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
                          />
                          Allow individual player re-entries
                        </Label>
                        <p className="text-xs text-text-muted mt-1">
                          Individual players can be re-entered by the tournament director
                        </p>
                      </div>

                      <div>
                        <Label className="flex items-center text-sm mb-0 cursor-pointer">
                          <input
                            type="checkbox"
                            name="allow_team_reentries"
                            checked={formValues.allow_team_reentries}
                            onChange={handleChange}
                            className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
                          />
                          Allow team re-entries
                        </Label>
                        <p className="text-xs text-text-muted mt-1">
                          Full teams can be re-entered by the tournament director
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {/* Re-entry options - Only show for singles events */}
          {formValues.event_format === EventFormat.SINGLES && (
            <div className="col-span-2" data-guide-id="guide-field-event-reentry">
              <div className="mb-4">
                <Label className="flex items-center text-sm mb-0 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allows_reentry"
                    checked={formValues.allows_reentry}
                    onChange={(e) => handleReentryToggle(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded mr-2"
                  />
                  Allow re-entries
                </Label>
              </div>
              
              {formValues.allows_reentry && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-border">
                  <div>
                    <Input
                      label="Maximum Re-entries"
                      name="max_reentries"
                      type="number"
                      min={1}
                      value={formValues.max_reentries === null ? '' : formValues.max_reentries}
                      onChange={handleChange}
                      placeholder="Leave blank for unlimited"
                    />
                  </div>
                  
                  <div>
                    <Input
                      label="Re-entry Fee ($)"
                      name="reentry_fee"
                      type="number"
                      min={0}
                      step={0.01}
                      value={formValues.reentry_fee === null ? '' : formValues.reentry_fee}
                      onChange={handleChange}
                      placeholder="Same as entry fee if blank"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="col-span-2">
            <SectionTitle size="medium" className="mb-2">Re-entry Prize Policy</SectionTitle>
            <p className="text-xs text-text-muted mb-2">
              Controls whether the same bowler can cash multiple placements from re-entries.
            </p>
            <Label className="mb-2">Duplicate Cashing Policy</Label>
            <Select
              value={
                String(
                  formValues.duplicate_cashing_policy ||
                    DuplicateCashingPolicy.ALLOW_MULTIPLE
                )
              }
              onChange={(value: string) =>
                setFormValues((prev) => ({
                  ...prev,
                  duplicate_cashing_policy: value as DuplicateCashingPolicy,
                }))
              }
              options={[
                {
                  value: DuplicateCashingPolicy.ALLOW_MULTIPLE,
                  label: 'Allow multiple cashing placements per bowler',
                },
                {
                  value: DuplicateCashingPolicy.SINGLE_AND_PROMOTE,
                  label: 'Single cash per bowler (promote next eligible)',
                },
              ]}
            />
          </div>
          
          {/* Description */}
          <div className="col-span-2">
            <label className="block mb-2 font-bold text-primary">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              value={formValues.description || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            ></textarea>
          </div>
          
          {/* Rules */}
          <div className="col-span-2">
            <label className="block mb-2 font-bold text-primary">
              Rules
            </label>
            <textarea
              name="rules"
              rows={6}
              value={formValues.rules || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            ></textarea>
          </div>
        </div>
      </Card>
      
      <p className="text-sm text-text-muted mb-6">
        Entry fees, house cut, and prize distribution can be configured after creation from the event page under Prize &amp; Payout Information.
      </p>

      <div className="mt-8 flex justify-end space-x-4">
        <Button
          variant="lightbackground"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="darkbackground"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          data-guide-id="guide-create-event-submit"
        >
          {isEdit ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
};

export default EventForm;
