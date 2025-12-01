'use client';

import { useEffect, useState } from 'react';
import { jobsClient } from '@/lib/colyseus/JobsClient';

export default function JobProgressUI() {
  const [loading, setLoading] = useState<{ duration: number; startTime: number; label: string; waypointId?: string } | null>(null);
  const [instruction, setInstruction] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onWait = (data: unknown) => {
      const payload = data as { seconds: number; label?: string; waypointId?: string };
      setLoading({
        duration: payload.seconds * 1000,
        startTime: Date.now(),
        label: payload.label || 'Procesando...',
        waypointId: payload.waypointId,
      });
    };

    const onNext = (data: unknown) => {
      const payload = data as { label?: string };
      if (payload.label) setInstruction(payload.label);
    };

    const onCompleted = () => {
      setLoading(null);
      setInstruction(null);
    };

    const onCancelled = () => {
      setLoading(null);
      setInstruction(null);
    };

    jobsClient.on('jobs:wait', onWait);
    jobsClient.on('jobs:next', onNext);
    jobsClient.on('jobs:completed', onCompleted);
    jobsClient.on('jobs:cancelled', onCancelled);

    return () => {
      jobsClient.off('jobs:wait', onWait);
      jobsClient.off('jobs:next', onNext);
      jobsClient.off('jobs:completed', onCompleted);
      jobsClient.off('jobs:cancelled', onCancelled);
    };
  }, []);

  // Update progress bar
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - loading.startTime;
      const p = Math.min(100, (elapsed / loading.duration) * 100);
      setProgress(p);

      if (p >= 100) {
        if (loading.waypointId) {
          jobsClient.hitWaypoint(loading.waypointId);
        }
        setLoading(null);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [loading]);

  if (!loading && !instruction) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {/* Instruction Banner */}
      {instruction && !loading && (
        <div className="bg-black/70 text-white px-6 py-2 rounded-full text-lg font-bold shadow-lg backdrop-blur-sm border border-white/10 animate-fade-in-down">
          {instruction}
        </div>
      )}

      {/* Loading Bar */}
      {loading && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-white font-bold text-shadow-md text-xl animate-pulse">
            {loading.label}
          </div>
          <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-600 shadow-xl">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-300 font-mono">
            {Math.ceil((loading.duration - (Date.now() - loading.startTime)) / 1000)}s
          </div>
        </div>
      )}
    </div>
  );
}
