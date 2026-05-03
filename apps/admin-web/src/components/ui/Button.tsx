import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'tonal';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-200 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.97] select-none';

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-button hover:shadow-button-hover hover:brightness-110',
      secondary:
        'bg-secondary text-white hover:bg-secondary-container shadow-sm hover:shadow-md',
      outline:
        'border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white',
      ghost:
        'bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
      danger:
        'bg-error text-white hover:bg-error-700 shadow-sm hover:shadow-md',
      tonal:
        'bg-primary-50 text-primary-800 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/30',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'h-9 px-3.5 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-sm gap-2',
      xl: 'h-14 px-8 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
