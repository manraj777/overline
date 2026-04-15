import React from 'react';
import { Check, Clock, ImageIcon, Star } from 'lucide-react';
import { cn, formatPrice, formatDuration } from '@/lib/utils';
import type { Service } from '@/types';
import { motion } from 'framer-motion';

interface ServiceListProps {
  services: Service[];
  selectedServices: Service[];
  onToggleService: (service: Service) => void;
  staffLabelByServiceId?: Record<string, string>;
}

const ServiceList: React.FC<ServiceListProps> = ({
  services,
  selectedServices,
  onToggleService,
  staffLabelByServiceId,
}) => {
  const isSelected = (serviceId: string) =>
    selectedServices.some((s) => s.id === serviceId);

  return (
    <div className="flex flex-col gap-6">
      {services.map((service, idx) => {
        const selected = isSelected(service.id);

        return (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              'flex items-start gap-4 p-4 rounded-3xl border border-outline-variant/20 transition-colors shadow-sm relative overflow-hidden',
              selected ? 'bg-primary/5 border-primary/40' : 'bg-surface hover:bg-surface-container-lowest'
            )}
          >
            {/* Left: Photo */}
            <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-surface-container flex items-center justify-center">
              {service.imageUrl ? (
                <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-outline-variant/50" />
              )}
            </div>

            {/* Middle: Details */}
            <div className="flex-1 min-w-0 pr-4 mt-1">
              {/* Optional vegan/veg indicator style icon could go here if it was food, we use a star occasionally */}
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-amber-500">Bestseller</span>
              </div>
              <h4 className={cn("text-lg font-black tracking-tight", selected ? "text-primary" : "text-on-surface")}>
                {service.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-on-surface">
                  {formatPrice(service.price)}
                </span>
                <span className="text-sm font-medium text-on-surface-variant flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(service.durationMinutes)}
                </span>
              </div>
              
              {service.description && (
                <p className="text-xs text-on-surface-variant mt-2 line-clamp-2 leading-relaxed max-w-[90%]">
                  {service.description}
                </p>
              )}

              {staffLabelByServiceId?.[service.id] && (
                <p className="text-[11px] mt-2 text-on-surface-variant/60 font-semibold">
                  ~ {staffLabelByServiceId[service.id]}
                </p>
              )}
            </div>
            
            {/* Right: Add Button overlaying the item context or placed inline */}
            <div className="absolute right-4 bottom-4 lg:relative lg:right-auto lg:bottom-auto lg:self-center lg:ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleService(service);
                }}
                className={cn(
                  'px-6 py-2 rounded-xl text-sm font-black transition-all shadow-button active:scale-95 border-2',
                  selected
                    ? 'bg-primary-fixed text-primary border-primary-fixed hover:bg-primary-fixed-dim'
                    : 'bg-white text-primary border-primary/20 hover:border-primary/50 text-primary hover:shadow-button-hover'
                )}
              >
                {selected ? 'ADDED' : 'ADD'}
                <div className="absolute top-0 right-0 -mr-2 -mt-2">
                   {selected && <Check className="w-4 h-4 bg-primary text-white rounded-full p-[2px]" />}
                </div>
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export { ServiceList };
