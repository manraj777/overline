import React from 'react';
import { cn } from '@/lib/utils';
import { getInitials, generateAvatar } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
  ...props
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const safeName = React.useMemo(() => {
    return encodeURIComponent(name?.trim() || 'User');
  }, [name]);

  const identiconUrl = `https://identicons.io/api/icon/${safeName}`;

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center',
        sizes[size],
        className
      )}
      {...props}
    >
      <img
        src={src || identiconUrl}
        alt={name}
        className="w-full h-full object-cover"
        onError={(e) => {
          if (e.currentTarget.src !== identiconUrl) {
            e.currentTarget.src = identiconUrl;
          }
        }}
      />
    </div>
  );
};

export { Avatar };
