export type JobId = 'car_wash' | 'hotel_staff' | 'delivery' | 'taxi' | 'custom';

export interface JobDefinition {
  id: JobId;
  name: string;
  description: string;
  basePay: number; // per task/unit
}

export interface ActiveJobState {
  userId: string;
  jobId: JobId;
  startedAt: number;
  progress?: number;
}

const JOBS: Record<JobId, JobDefinition> = {
  car_wash: { id: 'car_wash', name: 'Car Wash', description: 'Wash vehicles for cash', basePay: 25 },
  hotel_staff: { id: 'hotel_staff', name: 'Hotel Staff', description: 'Assist hotel operations', basePay: 40 },
  delivery: { id: 'delivery', name: 'Delivery', description: 'Deliver packages around the city', basePay: 35 },
  taxi: { id: 'taxi', name: 'Taxi', description: 'Drive NPCs to destinations', basePay: 45 },
  custom: { id: 'custom', name: 'Custom Job', description: 'Custom gameplay-defined job', basePay: 10 },
};

const activeJobs = new Map<string, ActiveJobState>();

export const jobsService = {
  listJobs(): JobDefinition[] {
    return Object.values(JOBS);
  },
  startJob(userId: string, jobId: JobId): ActiveJobState {
    const def = JOBS[jobId];
    if (!def) throw new Error('Unknown job');
    const state: ActiveJobState = { userId, jobId, startedAt: Date.now(), progress: 0 };
    activeJobs.set(userId, state);
    return state;
  },
  updateProgress(userId: string, progress: number): ActiveJobState | null {
    const state = activeJobs.get(userId);
    if (!state) return null;
    state.progress = progress;
    return state;
  },
  completeJob(userId: string): { payout: number } | null {
    const state = activeJobs.get(userId);
    if (!state) return null;
    const def = JOBS[state.jobId];
    const payout = def.basePay * (state.progress ?? 1);
    activeJobs.delete(userId);
    return { payout };
  },
  cancelJob(userId: string): boolean {
    return activeJobs.delete(userId);
  }
};


