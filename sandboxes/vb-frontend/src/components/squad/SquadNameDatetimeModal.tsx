import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import DateTimeField from '../common/DateTimeField';
import {
  getLaterOfEventStartOrNow,
  naiveDateTimeToMinuteKey,
  parseNaiveDateTimeToDate,
  toTimezoneNaiveISO,
  validateSquadDates,
} from '../../utils/dateUtils';

export type SquadNameDatetimeModalMode = 'create' | 'edit';

export interface SquadNameDatetimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: SquadNameDatetimeModalMode;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  initialName?: string;
  initialStartDatetime?: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
  onSubmit: (values: { name: string; start_datetime: string }) => void;
}

function defaultStartDatetimeForCreate(
  eventStart?: string | null,
  eventEnd?: string | null
): string {
  let candidate = getLaterOfEventStartOrNow(eventStart);
  const maxD = parseEventBound(eventEnd, 'end');
  if (maxD && candidate > maxD) candidate = maxD;
  const minD = parseEventBound(eventStart, 'start');
  if (minD && candidate < minD) candidate = minD;
  return toTimezoneNaiveISO(candidate).slice(0, 19);
}

/** API may send full datetime or date-only; min/max need real `Date` objects for the picker. */
function parseEventBound(
  raw: string | null | undefined,
  kind: 'start' | 'end'
): Date | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.trim().replace(' ', 'T');
  const parsed = parseNaiveDateTimeToDate(t);
  if (parsed) return parsed;
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(t.slice(0, 10));
  if (!m) return undefined;
  const day = m[0];
  return parseNaiveDateTimeToDate(
    kind === 'start' ? `${day}T00:00:00` : `${day}T23:59:59`
  ) ?? undefined;
}

/** Normalize for `validateSquadDates` when the API sends date-only bounds. */
function normalizeEventDatetimeForValidation(
  raw: string | null | undefined,
  kind: 'start' | 'end'
): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().replace(' ', 'T');
  if (t.includes('T')) return t.slice(0, 19);
  const day = t.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return kind === 'start' ? `${day}T00:00:00` : `${day}T23:59:59`;
}

const SquadNameDatetimeModal: React.FC<SquadNameDatetimeModalProps> = ({
  isOpen,
  onClose,
  mode,
  eventStartDate,
  eventEndDate,
  initialName = '',
  initialStartDatetime,
  isSubmitting,
  errorMessage,
  onClearError,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [startDatetime, setStartDatetime] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLocalError(null);
    onClearError?.();
    if (mode === 'edit') {
      setName(initialName || '');
      setStartDatetime(
        initialStartDatetime ? initialStartDatetime.slice(0, 19) : ''
      );
    } else {
      setName(initialName?.trim() || '');
      setStartDatetime(defaultStartDatetimeForCreate(eventStartDate, eventEndDate));
    }
  }, [isOpen, mode, initialName, initialStartDatetime, eventStartDate, eventEndDate, onClearError]);

  const pickerBounds = useMemo(() => {
    const min = parseEventBound(eventStartDate, 'start');
    const max = parseEventBound(eventEndDate, 'end');
    if (min && max && min > max) {
      return { min: undefined as Date | undefined, max: undefined as Date | undefined };
    }
    return { min, max };
  }, [eventStartDate, eventEndDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError?.();

    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError('Squad name is required');
      return;
    }
    if (!startDatetime) {
      setLocalError('Start date and time is required');
      return;
    }

    const normStart = normalizeEventDatetimeForValidation(eventStartDate, 'start');
    const normEnd = normalizeEventDatetimeForValidation(eventEndDate, 'end');
    if (normStart && normEnd) {
      const v = validateSquadDates(startDatetime, normStart, normEnd);
      if (!v.isValid) {
        setLocalError(v.errorMessage || 'Invalid squad start time');
        return;
      }
    }

    const apiDatetime = `${naiveDateTimeToMinuteKey(startDatetime)}:00`;
    onSubmit({ name: trimmed, start_datetime: apiDatetime });
  };

  const title = mode === 'create' ? 'Add squad to round' : 'Edit squad';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="medium"
      closeOnOutsideClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(localError || errorMessage) && (
          <Alert
            variant="error"
            message={localError || errorMessage || ''}
            onDismiss={() => {
              setLocalError(null);
              onClearError?.();
            }}
          />
        )}

        <div>
          <label
            htmlFor="squad_name_dt_name"
            className="mb-1 block text-sm font-medium text-text-muted"
          >
            Squad name
          </label>
          <input
            id="squad_name_dt_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
            placeholder="e.g. Squad A, Morning squad"
            required
            autoComplete="off"
          />
        </div>

        <DateTimeField
          label="Start date and time"
          id="squad_name_dt_start"
          value={startDatetime || null}
          onChange={(v) => setStartDatetime(v ?? '')}
          minDateTime={pickerBounds.min}
          maxDateTime={pickerBounds.max}
          required
          fullWidth
          helperText={
            pickerBounds.min && pickerBounds.max
              ? 'Only times within the event start and end can be selected.'
              : pickerBounds.min || pickerBounds.max
                ? 'Times outside the configured event window cannot be selected.'
                : undefined
          }
        />

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="lightbackground"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="darkbackground" disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create squad'
                : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SquadNameDatetimeModal;
