import React from 'react';
import { Check, Clock } from 'lucide-react';
import { cn, formatPrice, formatDuration } from '@/lib/utils';
import type { Service } from '@/types';
import { motion } from 'framer-motion';

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
    <div className="flex flex-col">
      {services.map((service, idx) => {
        const selected = isSelected(service.id);

        return (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              'flex justify-between items-center py-5 border-b border-outline-variant/10 transition-colors',
              selected ? 'bg-primary/5' : ''
            )}
          >
            <div className="flex flex-col max-w-[70%]">
              <h4 className={cn("text-lg font-bold", selected ? "text-primary" : "text-on-surface")}>
                {service.name}
              </h4>
              <span className="text-sm font-bold text-on-surface mt-1">
                {formatPrice(service.price)} • {formatDuration(service.durationMinutes)}
              </span>
              {service.description && (
                <p className="text-sm text-on-surface-variant mt-1.5 line-clamp-2">
                  {service.description}
                </p>
              )}
            </div>
            
            <div className="flex flex-col items-end justify-center ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleService(service);
                }}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm',
                  selected
                    ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md'
                )}
              >
                {selected ? 'Remove' : '+ Add to Cart'}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export { ServiceList };
