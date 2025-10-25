'use client';

import { useEffect, useState } from 'react';
import jobsClient from '@/lib/colyseus/JobsClient';
import { useUIStore } from '@/store/uiStore';
import { economy } from '@/lib/services/economy';

type JobsList = { jobs: { id: string; name: string; basePay: number }[] };
type JobData = { id: string; name: string; description: string; basePay: number; maxProgress: number; rewardItem?: { itemId: string; quantity?: number } | null };

export default function JobsUI() {
  const { isJobsOpen, toggleJobs } = useUIStore();
  const [list, setList] = useState<JobsList | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onList = (data: unknown) => setList(data as JobsList);
    const onData = (data: unknown) => { setJob(data as JobData); setProgress(0); };
    const onError = (data: unknown) => setMessage((data as { message: string }).message);
    const onStarted = () => setMessage('Trabajo iniciado');
    const onProgress = (data: unknown) => setProgress((data as { progress: number }).progress);
    const onCompleted = (data: unknown) => setMessage(`Completado. Pago: ${economy.format((data as { payout: number }).payout)}`);
    const onCancelled = () => setMessage('Trabajo cancelado');
    jobsClient.on('jobs:list', onList);
    jobsClient.on('jobs:data', onData);
    jobsClient.on('jobs:error', onError);
    jobsClient.on('jobs:started', onStarted);
    jobsClient.on('jobs:progress', onProgress);
    jobsClient.on('jobs:completed', onCompleted);
    jobsClient.on('jobs:cancelled', onCancelled);
    const onWait = (data: unknown) => setMessage(`Espera ${Math.ceil((data as { seconds: number }).seconds)}s...`);
    const onNext = (data: unknown) => setMessage(`Siguiente: ${(data as { label?: string }).label ?? 'punto siguiente'}`);
    jobsClient.on('jobs:wait', onWait);
    jobsClient.on('jobs:next', onNext);
    jobsClient.requestJobs();
    return () => {
      jobsClient.off('jobs:list', onList);
      jobsClient.off('jobs:data', onData);
      jobsClient.off('jobs:error', onError);
      jobsClient.off('jobs:started', onStarted);
      jobsClient.off('jobs:progress', onProgress);
      jobsClient.off('jobs:completed', onCompleted);
      jobsClient.off('jobs:cancelled', onCancelled);
      jobsClient.off('jobs:wait', onWait);
      jobsClient.off('jobs:next', onNext);
    };
  }, []);

  if (!isJobsOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-3xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white text-xl font-bold">Trabajos</h2>
          <button onClick={toggleJobs} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>
        {message && (
          <div className="mb-2 text-sm text-yellow-300">{message}</div>
        )}
        {!job ? (
          <div className="grid grid-cols-2 gap-2">
            {list?.jobs.map(j => (
              <button key={j.id} onClick={() => jobsClient.openJob(j.id)} className="bg-gray-800 hover:bg-gray-700 text-white rounded p-3 text-left">
                <div className="font-semibold">{j.name}</div>
                <div className="text-xs text-gray-400">Pago base: {economy.format(j.basePay)}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-white text-lg font-semibold">{job.name}</div>
              <button onClick={() => setJob(null)} className="text-sm text-gray-300 hover:text-white">← Volver</button>
            </div>
            <div className="text-gray-300 text-sm mb-3">{job.description}</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-white">Progreso: {progress}/{job.maxProgress}</div>
              <button onClick={() => { const next = Math.min(job.maxProgress, progress + 1); setProgress(next); jobsClient.updateProgress(next); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">+1</button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => jobsClient.start(job.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">Iniciar</button>
              <button onClick={() => jobsClient.complete()} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded">Completar</button>
              <button onClick={() => jobsClient.cancel()} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">Cancelar</button>
            </div>
            <div className="mt-2 text-xs text-gray-400">Tip: Acércate a los puntos de entrega para marcar el progreso.</div>
          </div>
        )}
      </div>
    </div>
  );
}


