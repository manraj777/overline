import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { StarRating } from '@/components/reviews/StarRating';
import { useCreateReview, usePendingReviewBooking } from '@/hooks';
import { useToast, Button } from '@/components/ui';

const DISMISS_KEY = 'overline_review_dismissed_at';

interface ReviewModalProps {
  /** If not provided, auto-detect from recent completed bookings */
  bookingId?: string;
  shopName?: string;
  onClose?: () => void;
}

export function ReviewModal({ bookingId: propBookingId, shopName: propShopName, onClose }: ReviewModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [targetBookingId, setTargetBookingId] = React.useState<string | null>(propBookingId || null);
  const [targetShopName, setTargetShopName] = React.useState(propShopName || '');

  const createReview = useCreateReview();
  const { addToast } = useToast();
  const { data: pendingReviewBooking } = usePendingReviewBooking();

  // Auto-detect unreviewable completed bookings
  React.useEffect(() => {
    if (propBookingId) {
      setTriggerModal(propBookingId, propShopName || '');
      return;
    }

    // Check dismiss cooldown (24 hours)
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 24 * 60 * 60 * 1000) return; // 24h cooldown
    }

    if (pendingReviewBooking) {
      // Show after 3s delay instead of 30s so users actually see it
      const timer = setTimeout(() => {
        setTriggerModal(pendingReviewBooking.id, pendingReviewBooking.shop?.name || 'your visit');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pendingReviewBooking, propBookingId, propShopName]);

  const setTriggerModal = (bookingId: string, shopName: string) => {
    setTargetBookingId(bookingId);
    setTargetShopName(shopName);
    setIsOpen(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsOpen(false);
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!targetBookingId || rating === 0) return;

    try {
      await createReview.mutateAsync({
        bookingId: targetBookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      addToast({
        type: 'success',
        title: 'Review submitted! 🙌',
        message: 'Thank you for your feedback.',
      });
      setIsOpen(false);
      onClose?.();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to submit',
        message: err.response?.data?.message || 'Please try again.',
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full md:max-w-md"
          >
            <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
              {/* Drag handle (mobile) */}
              <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="px-6 pt-4 pb-8">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Star className="w-7 h-7 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    How was your experience?
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Rate your visit at <span className="font-medium text-gray-700">{targetShopName}</span>
                  </p>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center mb-6">
                  <StarRating rating={rating} size="lg" interactive onChange={setRating} />
                </div>

                {/* Comment */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  placeholder="Tell others about your visit... (optional)"
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {comment.length}/500
                </p>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleDismiss}
                    className="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Skip for now
                  </button>
                  <Button
                    onClick={handleSubmit}
                    isLoading={createReview.isPending}
                    disabled={rating === 0}
                    className="flex-1 rounded-xl"
                  >
                    Submit Review
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
