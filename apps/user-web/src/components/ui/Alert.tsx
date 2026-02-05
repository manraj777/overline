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
      container: 'bg-blue-50 border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      title: 'text-blue-800',
      content: 'text-blue-700',
    },
    success: {
      container: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: 'text-green-800',
      content: 'text-green-700',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200',
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      title: 'text-amber-800',
      content: 'text-amber-700',
    },
    error: {
      container: 'bg-red-50 border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      title: 'text-red-800',
      content: 'text-red-700',
    },
  };

  const styles = variants[variant];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex gap-3',
        styles.container,
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <div className="flex-1">
        {title && (
          <h4 className={cn('font-medium mb-1', styles.title)}>{title}</h4>
        )}
        <div className={cn('text-sm', styles.content)}>{children}</div>
      </div>
    </div>
  );
};

export { Alert };
