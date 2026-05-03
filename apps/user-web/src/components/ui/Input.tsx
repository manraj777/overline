import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, leftIcon, rightIcon, id, ...props },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold tracking-wide text-on-surface-variant mb-1.5 uppercase"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full h-11 rounded-xl bg-surface-container-low border border-outline-variant px-4 text-sm text-on-surface placeholder:text-on-surface-variant/60',
              'focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 focus:bg-surface-container-lowest',
              'disabled:bg-surface-container/50 disabled:text-on-surface-variant disabled:cursor-not-allowed',
              'transition-all duration-200',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-error focus:border-error focus:ring-error/15',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-on-surface-variant">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs font-medium text-error">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-on-surface-variant">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
