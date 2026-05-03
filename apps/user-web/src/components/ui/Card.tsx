import React from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'bordered' | 'elevated' | 'glass' | 'gradient';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', interactive = false, children, ...props }, ref) => {
    const variants: Record<CardVariant, string> = {
      default: 'bg-surface-container shadow-card',
      bordered: 'bg-surface-container-lowest border border-outline-variant/60',
      elevated: 'bg-surface-container-lowest shadow-glass-strong',
      glass: 'bg-surface-container-lowest/70 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-glass',
      gradient:
        'bg-gradient-to-br from-primary-50 via-surface-container-lowest to-primary-50 dark:from-primary-900/20 dark:via-surface-container dark:to-primary-900/10 border border-outline-variant/40',
    };

    const paddings: Record<CardPadding, string> = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6 md:p-8',
      xl: 'p-8 md:p-12',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl',
          variants[variant],
          paddings[padding],
          interactive && 'transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold tracking-tight text-on-surface', className)}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-on-surface-variant', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
