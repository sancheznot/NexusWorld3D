'use client';

import { useEffect, useState } from 'react';
import jobsClient from '@/lib/colyseus/JobsClient';
import { useUIStore } from '@/store/uiStore';
import { economy } from '@/lib/services/economy';
import { usePlayerStore } from '@/store/playerStore';
import { JOBS } from '@/constants/jobs';
import type { ExtendedJobId } from '@/constants/jobs';

type JobData = { id: ExtendedJobId; name: string; description: string; basePay: number; maxProgress: number; rewardItem?: { itemId: string; quantity?: number } | null };

export default function JobsUI() {
  const { isJobsOpen, closeJobs, selectedJobId } = useUIStore();
  const [job, setJob] = useState<JobData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const currentRoleId = usePlayerStore(state => state.player?.roleId ?? null);
  const currentRoleName = currentRoleId ? (JOBS[currentRoleId]?.name ?? currentRoleId) : 'Ninguno';

  useEffect(() => {
    const onData = (data: unknown) => {
      const jobData = data as JobData;
      setJob(jobData);
      setIsAssigning(false);
      setMessage(null);
    };
    const onError = (data: unknown) => {
      setIsAssigning(false);
      setMessage((data as { message: string }).message);
    };
    const onRoleAssigned = (data: unknown) => {
      setIsAssigning(false);
      const payload = data as { jobId: string };
      const roleId = payload.jobId as ExtendedJobId;
      const roleName = JOBS[roleId]?.name ?? payload.jobId;
      setMessage(`Rol asignado: ${roleName}`);
    };
    const onStarted = () => setMessage('Trabajo iniciado');
    const onCompleted = (data: unknown) => setMessage(`Completado. Pago: ${economy.format((data as { payout: number }).payout)}`);
    const onCancelled = () => setMessage('Trabajo cancelado');

    jobsClient.on('jobs:data', onData);
    jobsClient.on('jobs:error', onError);
    jobsClient.on('jobs:role:assigned', onRoleAssigned);
    jobsClient.on('jobs:started', onStarted);
    jobsClient.on('jobs:completed', onCompleted);
    jobsClient.on('jobs:cancelled', onCancelled);

    return () => {
      jobsClient.off('jobs:data', onData);
      jobsClient.off('jobs:error', onError);
      jobsClient.off('jobs:role:assigned', onRoleAssigned);
      jobsClient.off('jobs:started', onStarted);
      jobsClient.off('jobs:completed', onCompleted);
      jobsClient.off('jobs:cancelled', onCancelled);
    };
  }, []);

  useEffect(() => {
    if (!isJobsOpen) {
      setJob(null);
      setMessage(null);
      setIsAssigning(false);
      return;
    }
    if (!selectedJobId) {
      setJob(null);
      return;
    }
    setMessage('Cargando información del trabajo...');
    setJob(null);
    setIsAssigning(false);
    jobsClient.openJob(selectedJobId);
  }, [isJobsOpen, selectedJobId]);

  if (!isJobsOpen) return null;

  const handleAssignRole = () => {
    if (!job || (currentRoleId && currentRoleId === job.id)) return;
    setIsAssigning(true);
    jobsClient.assignRole(job.id);
  };

  const handleClose = () => {
    closeJobs();
    setJob(null);
    setMessage(null);
    setIsAssigning(false);
  };

  const alreadyAssigned = !!job && currentRoleId === job.id;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-3xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white text-xl font-bold">Trabajos</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>
        {message && (
          <div className="mb-2 text-sm text-yellow-300">{message}</div>
        )}
        <div className="text-sm text-gray-400 mb-3">
          Rol actual: <span className="text-gray-200">{currentRoleName}</span>
        </div>
        {!selectedJobId ? (
          <div className="text-gray-300 text-sm">
            Habla con un NPC de trabajo para ver los detalles y asignarte un rol.
          </div>
        ) : !job ? (
          <div className="text-gray-400 text-sm">
            Cargando información del trabajo...
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-white text-lg font-semibold">{job.name}</div>
              <div className="text-gray-300 text-sm">{job.description}</div>
            </div>
            <div className="text-gray-400 text-sm">
              Pago base: {economy.format(job.basePay)}
              {job.rewardItem && (
                <span> • Recompensa: {job.rewardItem.itemId}{job.rewardItem.quantity ? ` x${job.rewardItem.quantity}` : ''}</span>
              )}
            </div>
            <div className="text-gray-500 text-xs">
              Máximo progreso estimado: {job.maxProgress}. El rol desbloqueará checkpoints específicos en el mundo.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAssignRole}
                disabled={isAssigning || alreadyAssigned}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-700/60 text-white px-3 py-1 rounded"
              >
                {alreadyAssigned ? 'Rol activo' : isAssigning ? 'Asignando...' : 'Asignar rol'}
              </button>
              <button onClick={handleClose} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">
                Cerrar
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Después de asignarte este rol, busca el checkpoint principal para iniciar la ruta correspondiente.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
