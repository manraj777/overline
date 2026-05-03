import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  className,
  ...props
}) => {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/50',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'text-blue-900 dark:text-blue-200',
      content: 'text-blue-800 dark:text-blue-300/90',
    },
    success: {
      container: 'bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-900/50',
      icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
      title: 'text-green-900 dark:text-green-200',
      content: 'text-green-800 dark:text-green-300/90',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50',
      icon: <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      title: 'text-amber-900 dark:text-amber-200',
      content: 'text-amber-800 dark:text-amber-300/90',
    },
    error: {
      container: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900/50',
      icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
      title: 'text-red-900 dark:text-red-200',
      content: 'text-red-800 dark:text-red-300/90',
    },
  };

  const styles = variants[variant];

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 flex gap-3',
        styles.container,
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0 pt-0.5">{styles.icon}</div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('font-semibold text-sm mb-0.5', styles.title)}>{title}</h4>
        )}
        <div className={cn('text-sm leading-relaxed', styles.content)}>{children}</div>
      </div>
    </div>
  );
};

export { Alert };
