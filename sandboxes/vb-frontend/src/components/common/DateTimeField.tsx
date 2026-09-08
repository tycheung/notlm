import React from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import Label from './Label';
import {
  parseNaiveDateTimeToDate,
  toTimezoneNaiveISOString,
} from '../../utils/dateUtils';

/** `Modal` portals at z-index 10000; MUI picker defaults are lower and would sit underneath. */
const PICKER_ABOVE_APP_MODAL_Z = 10050;

export interface DateTimeFieldProps {
  /** When omitted, render only the picker (use an external Label). */
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  minDateTime?: Date;
  maxDateTime?: Date;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
  className?: string;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  minDateTime,
  maxDateTime,
  required,
  disabled,
  id,
  fullWidth = true,
  error,
  helperText,
  className = '',
}) => {
  const selected = parseNaiveDateTimeToDate(value);

  return (
    <div className={`${fullWidth ? 'w-full min-w-0 max-w-full' : ''} ${className}`}>
      {label != null && label !== '' && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      <DateTimePicker
        value={selected}
        onChange={(d) => onChange(d ? toTimezoneNaiveISOString(d) : null)}
        disabled={disabled}
        minDateTime={minDateTime}
        maxDateTime={maxDateTime}
        slotProps={{
          textField: {
            id,
            fullWidth,
            required,
            error: !!error,
            helperText,
            variant: 'outlined',
            size: 'small',
          },
          popper: {
            sx: { zIndex: PICKER_ABOVE_APP_MODAL_Z },
          },
          dialog: {
            sx: { zIndex: PICKER_ABOVE_APP_MODAL_Z },
          },
        }}
      />
    </div>
  );
};

export default DateTimeField;
