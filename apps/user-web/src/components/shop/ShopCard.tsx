import React from 'react';
import Link from 'next/link';
import { MapPin, Clock, Star, Users } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Shop } from '@overline/shared';

interface ShopCardProps {
  shop: Shop;
  queueInfo?: {
    currentWait: number;
    peopleInQueue: number;
  };
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, queueInfo }) => {
  const isOpen = true; // TODO: Calculate based on working hours

  return (
    <Link href={`/shops/${shop.slug}`}>
      <Card
        variant="bordered"
        padding="none"
        className="overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
      >
        {/* Shop Image */}
        <div className="relative h-40 bg-gray-100">
          {shop.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600">
              <span className="text-4xl text-white font-bold">
                {shop.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge variant={isOpen ? 'success' : 'error'}>
              {isOpen ? 'Open' : 'Closed'}
            </Badge>
          </div>
        </div>

        {/* Shop Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {shop.name}
          </h3>

          <div className="flex items-center text-gray-500 text-sm mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="truncate">{shop.address}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center text-amber-500">
              <Star className="w-4 h-4 fill-current mr-1" />
              <span className="font-medium text-gray-900">4.8</span>
              <span className="text-gray-400 text-sm ml-1">(120)</span>
            </div>
          </div>

          {/* Queue Info */}
          {queueInfo && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                <span>{queueInfo.peopleInQueue} in queue</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>~{queueInfo.currentWait} min wait</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
};

export { ShopCard };
