import React from 'react';
import { Check, Clock } from 'lucide-react';
import { cn, formatPrice, formatDuration } from '@/lib/utils';
import type { Service } from '@overline/shared';

interface ServiceListProps {
  services: Service[];
  selectedServices: Service[];
  onToggleService: (service: Service) => void;
}

const ServiceList: React.FC<ServiceListProps> = ({
  services,
  selectedServices,
  onToggleService,
}) => {
  const isSelected = (serviceId: string) =>
    selectedServices.some((s) => s.id === serviceId);

  return (
    <div className="space-y-3">
      {services.map((service) => {
        const selected = isSelected(service.id);

        return (
          <button
            key={service.id}
            onClick={() => onToggleService(service)}
            className={cn(
              'w-full p-4 rounded-xl border-2 text-left transition-all duration-200',
              selected
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{service.name}</h4>
                {service.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {service.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatDuration(service.durationMinutes)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">
                  {formatPrice(service.price)}
                </span>
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                    selected
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-gray-300'
                  )}
                >
                  {selected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export { ServiceList };
