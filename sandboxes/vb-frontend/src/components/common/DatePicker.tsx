import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  dateFormat?: string;
  placeholderText?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showTimeSelect?: boolean;
  timeFormat?: string;
  timeIntervals?: number;
  [key: string]: any; // Allow other props to be passed through
}

const DatePicker: React.FC<DatePickerProps> = ({ 
  onChange, 
  selected,
  className = '',
  ...rest
}) => {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      className={`${className} focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary`}
      dateFormat="MM/dd/yyyy"
      {...rest}
    />
  );
};

export default DatePicker; 
