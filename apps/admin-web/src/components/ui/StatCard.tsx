import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number | string;
    type: 'increase' | 'decrease';
  };
  icon: LucideIcon;
  iconColor?: string;
  gradient?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'bg-primary-100 text-primary-600',
  gradient,
}) => {
  return (
    <div className={cn(
      'rounded-2xl border p-6 transition-all duration-300 hover:shadow-md',
      gradient
        ? `${gradient} text-white border-transparent`
        : 'bg-white border-gray-200'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className={cn('text-sm font-medium', gradient ? 'text-white/80' : 'text-gray-500')}>
            {title}
          </p>
          <p className={cn('text-3xl font-bold mt-1', gradient ? 'text-white' : 'text-gray-900')}>
            {value}
          </p>
          {change && (
            <p className={cn(
              'text-sm mt-2 flex items-center gap-1 font-medium',
              gradient
                ? 'text-white/90'
                : change.type === 'increase' ? 'text-green-600' : 'text-red-600'
            )}>
              {change.type === 'increase'
                ? <TrendingUp className="w-4 h-4" />
                : <TrendingDown className="w-4 h-4" />
              }
              <span>{typeof change.value === 'number' ? Math.abs(change.value) : change.value}{typeof change.value === 'number' ? '%' : ''}</span>
              <span className={gradient ? 'text-white/70' : 'text-gray-400'}>from yesterday</span>
            </p>
          )}
        </div>
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center',
          gradient ? 'bg-white/20' : iconColor
        )}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
};

export { StatCard };
