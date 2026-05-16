import React from 'react';
import { useAlertStore } from '@/stores/alert';
import { useRouter } from 'next/router';
import { BellRing, X, CalendarCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NewBookingAlertModal() {
  const { newBooking, setNewBooking } = useAlertStore();
  const router = useRouter();

  if (!newBooking) return null;

  const handleClose = () => {
    setNewBooking(null);
  };

  const handleView = () => {
    setNewBooking(null);
    if (router.pathname !== '/appointments') {
      router.push('/appointments');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-surface w-full max-w-lg rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(var(--primary-rgb),0.3)] relative"
        >
          {/* Animated Background Pulse */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-primary/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent" />
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className="absolute -top-16 -left-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.5, 0.2] 
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="absolute -top-20 -right-20 w-80 h-80 bg-tertiary/20 rounded-full blur-3xl"
            />
          </div>

          <div className="relative pt-10 pb-8 px-8 flex flex-col items-center text-center">
            {/* Bell Icon Circle */}
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 mb-6 relative">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.2, repeat: Infinity, repeatDelay: 1.5 }}
              >
                <BellRing className="w-12 h-12" />
              </motion.div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-tertiary flex items-center justify-center text-white">
                  <span className="text-xs font-black">1</span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-black text-on-surface mb-3 tracking-tight">
              {newBooking.title}
            </h2>
            <p className="text-lg text-on-surface-variant font-medium mb-8 leading-relaxed max-w-sm">
              {newBooking.body}
            </p>

            {newBooking.bookingNumber && (
              <div className="bg-surface-container py-2 px-4 rounded-xl mb-8 border border-outline-variant/20 inline-block">
                <p className="text-sm font-bold text-outline tracking-widest uppercase mb-1">Booking Ref</p>
                <p className="text-xl font-black text-primary">{newBooking.bookingNumber}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <button
                onClick={handleClose}
                className="w-full py-4 rounded-2xl font-black text-on-surface bg-surface-container-high hover:bg-outline-variant/20 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleView}
                className="w-full py-4 rounded-2xl font-black text-white bg-primary hover:bg-primary-dim transition-colors shadow-button flex items-center justify-center gap-2"
              >
                <CalendarCheck className="w-5 h-5" />
                View Now
              </button>
            </div>
          </div>

          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
