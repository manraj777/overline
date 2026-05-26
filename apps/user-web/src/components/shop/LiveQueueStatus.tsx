import React from 'react';
import { Users, Clock, Zap } from 'lucide-react';
import { useQueueSocket } from '@/hooks';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveQueueStatusProps {
  shopId: string;
  fallbackStats?: {
    waitingCount: number;
    estimatedWaitMinutes: number;
  } | null;
}

export const LiveQueueStatus: React.FC<LiveQueueStatusProps> = ({ shopId, fallbackStats }) => {
  const [stats, setStats] = React.useState<{
    waitingCount: number;
    estimatedWaitMinutes: number;
  } | null>(null);

  const [timedOut, setTimedOut] = React.useState(false);

  const { connected, lastUpdate } = useQueueSocket({
    shopId,
    enabled: !!shopId,
    onQueueUpdate: (update) => {
      setStats({
        waitingCount: update.stats.waitingCount,
        estimatedWaitMinutes: update.stats.estimatedWaitMinutes,
      });
    },
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!connected) {
        setTimedOut(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [connected]);

  React.useEffect(() => {
    if (connected) setTimedOut(false);
  }, [connected]);

  const displayStats = stats || lastUpdate?.stats || fallbackStats;

  if (!displayStats && timedOut) return null;
  if (!displayStats && !timedOut) return null;

  return (
    <AnimatePresence>
      {displayStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 inset-x-0 mx-auto w-max z-50 pointer-events-none px-4"
        >
          <div className="glass-dark bg-lexo-black/80 text-white rounded-full px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 flex items-center justify-between gap-6 pointer-events-auto backdrop-blur-2xl">

            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-green-500' : 'bg-gray-500'}`} />
              </span>
              <span className="font-bold tracking-wide uppercase text-[10px] text-white/50 hidden sm:inline-block">Live Status</span>
            </div>

            <div className="flex items-center gap-4 text-sm sm:text-base font-bold">
              {displayStats.waitingCount === 0 ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Zap className="w-5 h-5" />
                  Available Now
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-white/90">
                    <Users className="w-5 h-5 text-indigo-400" />
                    {displayStats.waitingCount} <span className="text-white/50 font-medium hidden sm:inline">in line</span>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                  <span className="flex items-center gap-1.5 text-white/90">
                    <Clock className="w-5 h-5 text-amber-400" />
                    ~{displayStats.estimatedWaitMinutes}m <span className="text-white/50 font-medium hidden sm:inline">wait</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
