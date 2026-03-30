'use client';

import { motion } from 'framer-motion';
import { statusLabel, type QueueEntryStatus } from '@/lib/queue';

interface QueueTrackerProps {
  tokenCode: string;
  aheadCount: number;
  estimatedMinutes: number;
  status: QueueEntryStatus;
}

const steps: Array<{ key: QueueEntryStatus | 'done'; label: string }> = [
  { key: 'waiting', label: 'Queue Joined' },
  { key: 'approaching', label: 'Turn Approaching' },
  { key: 'in_progress', label: 'In Service' },
  { key: 'done', label: 'Done' },
];

function currentStepIndex(status: QueueEntryStatus): number {
  if (status === 'waiting') return 0;
  if (status === 'approaching') return 1;
  if (status === 'in_progress') return 2;
  return 3;
}

export default function QueueTracker({ tokenCode, aheadCount, estimatedMinutes, status }: QueueTrackerProps) {
  const stepIndex = currentStepIndex(status);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <section className="rounded-3xl border border-white/15 bg-[#101622]/90 p-6 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-center justify-between text-sm text-white/70">
        <span>Live Tracking</span>
        <span>{statusLabel(status)}</span>
      </div>

      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#f6bd60] to-[#84a59d]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 text-xs text-white/70 sm:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={index <= stepIndex ? 'font-semibold text-[#f6bd60]' : 'text-white/50'}
          >
            {step.label}
          </div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0.8 }}
        animate={{ scale: [1, 1.03, 1], opacity: 1 }}
        transition={{ repeat: Infinity, duration: 2.2 }}
        className="mb-5 rounded-2xl border border-[#f6bd60]/40 bg-[#1a2232] p-6 text-center"
      >
        <div className="text-xs uppercase tracking-[0.2em] text-white/65">Your Token</div>
        <div className="mt-2 text-5xl font-black tracking-wider text-[#f6bd60]">{tokenCode}</div>
      </motion.div>

      <div className="grid gap-2 text-sm text-white/80">
        <p>{aheadCount > 0 ? `${aheadCount} people ahead of you` : "You're next!"}</p>
        <p>Estimated time: {estimatedMinutes} minutes</p>
        <p>
          {aheadCount > 2
            ? 'Sit back, we will notify you when your turn is near.'
            : aheadCount > 0
              ? 'Your turn is almost here. Please stay nearby.'
              : 'Please proceed to the counter.'}
        </p>
      </div>
    </section>
  );
}
