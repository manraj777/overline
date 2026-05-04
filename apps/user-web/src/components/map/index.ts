import dynamic from 'next/dynamic';
import React from 'react';

export const ShopMap = dynamic(
    () => import('./ShopMap').then((mod) => mod.ShopMap),
    { 
        ssr: false,
        loading: () => React.createElement(
            'div',
            { className: 'h-full w-full min-h-[300px] bg-surface-container animate-pulse rounded-lg flex items-center justify-center' },
            React.createElement('span', { className: 'text-on-surface-variant text-sm' }, 'Loading Map...')
        )
    }
);
