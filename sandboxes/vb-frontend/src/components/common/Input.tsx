import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  /** Extra classes on the outer wrapper (layout only — not the input). */
  wrapperClassName?: string;
  /** Omit default bottom margin on the wrapper (e.g. nested search inside a dropdown). */
  omitMargin?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      wrapperClassName = '',
      omitMargin = false,
      id,
      ...rest
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? (label ? generatedId : undefined);
    // Base input styles - responsive font size for web-friendly scaling.
    // Horizontal padding is set below so icon offsets stay correct at all breakpoints:
    // `sm:px-3` would override a plain `pl-10` and collapse space next to the icon.
    const baseInputStyles =
      'py-2 sm:py-[9px] bg-surface-light text-text rounded-input border focus:outline-none focus:ring-2 transition-colors duration-200 box-border text-sm sm:text-base';

    // Error styles - using mobile-app danger color
    const errorStyles = error
      ? 'border-danger focus:border-danger focus:ring-danger/50'
      : 'border-border focus:border-primary focus:ring-primary/50';

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    const horizontalPadding = leftIcon && rightIcon
      ? 'pl-11 sm:pl-11 pr-11 sm:pr-11'
      : leftIcon
        ? 'pl-11 sm:pl-11 pr-3 sm:pr-3'
        : rightIcon
          ? 'pl-3 sm:pl-3 pr-11 sm:pr-11'
          : 'px-3 sm:px-3';

    return (
      <div
        className={`${fullWidth ? 'w-full min-w-0 max-w-full' : ''} ${omitMargin ? '' : 'mb-field'} ${wrapperClassName}`.trim()}
      >
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-1 text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-[0.06em]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`${baseInputStyles} ${errorStyles} ${widthStyles} ${horizontalPadding} ${className}`}
            {...rest}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1 text-xs sm:text-sm text-danger">{error}</p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-xs sm:text-sm text-text-dim">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
