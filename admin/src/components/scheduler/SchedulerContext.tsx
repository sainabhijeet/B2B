import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  type JobHistoryRow,
  type JobQueueRow,
  type ScheduledJobRow,
  type ScheduledJobStatus,
  type SchedulerSettings,
} from '@/lib/schedulerModels';
import { loadAdminModuleState, saveAdminModuleState } from '@/lib/adminModuleStateApi';
import { runAdminJob, schedulerJobKey, type AdminJobRun } from '@/lib/adminSchedulerApi';

type SchedulerValue = {
  jobs: ScheduledJobRow[];
  setJobs: Dispatch<SetStateAction<ScheduledJobRow[]>>;
  history: JobHistoryRow[];
  setHistory: Dispatch<SetStateAction<JobHistoryRow[]>>;
  queue: JobQueueRow[];
  setQueue: Dispatch<SetStateAction<JobQueueRow[]>>;
  settings: SchedulerSettings;
  setSettings: Dispatch<SetStateAction<SchedulerSettings>>;
  updateJob: (jobId: string, patch: Partial<Pick<ScheduledJobRow, 'jobName' | 'module' | 'frequency'>>) => void;
  setJobStatus: (jobId: string, status: ScheduledJobStatus) => void;
  runJobNow: (job: ScheduledJobRow) => void;
  manualTrigger: (jobName: string, module: string) => void;
};

const SchedulerContext = createContext<SchedulerValue | null>(null);

type SchedulerBackendState = {
  jobs: ScheduledJobRow[];
  history: JobHistoryRow[];
  queue: JobQueueRow[];
  settings: SchedulerSettings;
};

const EMPTY_SCHEDULER_STATE: SchedulerBackendState = {
  jobs: [],
  history: [],
  queue: [],
  settings: {
    maxWorkers: 1,
    retryAttempts: 2,
    jobTimeoutSeconds: 60,
    queueIntervalSeconds: 5,
  },
};

export function SchedulerProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<ScheduledJobRow[]>([]);
  const [history, setHistory] = useState<JobHistoryRow[]>([]);
  const [queue, setQueue] = useState<JobQueueRow[]>([]);
  const [settings, setSettings] = useState<SchedulerSettings>(EMPTY_SCHEDULER_STATE.settings);
  const loadedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    loadAdminModuleState<SchedulerBackendState>('scheduler', EMPTY_SCHEDULER_STATE)
      .then((state) => {
        if (!alive) return;
        setJobs(state.jobs ?? []);
        setHistory(state.history ?? []);
        setQueue(state.queue ?? []);
        setSettings(state.settings ?? EMPTY_SCHEDULER_STATE.settings);
        loadedRef.current = true;
      })
      .catch(() => {
        if (alive) loadedRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    void saveAdminModuleState<SchedulerBackendState>('scheduler', { jobs, history, queue, settings });
  }, [jobs, history, queue, settings]);

  const recordRun = useCallback((run: AdminJobRun, jobId: string, jobName: string) => {
    setJobs((list) =>
      list.map((row) => (row.jobId === jobId ? { ...row, lastRun: run.executedAt } : row)),
    );
    setHistory((rows) => [{
      historyId: run.runId,
      jobId,
      jobName,
      status: run.status,
      durationMs: run.durationMs,
      executedAt: run.executedAt,
      result: run.result,
    }, ...rows]);
    setQueue((rows) => [{
      queueId: run.queueId || run.runId,
      jobType: jobName,
      status: 'completed',
      createdAt: run.executedAt,
      worker: 'backend',
    }, ...rows.slice(0, 19)]);
  }, []);

  const execute = useCallback((jobId: string, jobName: string, module: string) => {
    const jobKey = schedulerJobKey(jobName);
    if (!jobKey) {
      window.alert(`${module} job is not registered with the production runner.`);
      return;
    }
    void runAdminJob(jobKey)
      .then((run) => {
        recordRun(run, jobId, jobName);
        window.alert(run.result);
      })
      .catch((error: unknown) => {
        window.alert(error instanceof Error ? error.message : 'Job could not be run.');
      });
  }, [recordRun]);

  const updateJob = useCallback(
    (jobId: string, patch: Partial<Pick<ScheduledJobRow, 'jobName' | 'module' | 'frequency'>>) => {
      setJobs((list) => list.map((job) => (job.jobId === jobId ? { ...job, ...patch } : job)));
    },
    [],
  );

  const setJobStatus = useCallback((jobId: string, status: ScheduledJobStatus) => {
    setJobs((list) =>
      list.map((job) =>
        job.jobId === jobId
          ? { ...job, status, nextRun: status === 'active' ? job.nextRun : null }
          : job,
      ),
    );
  }, []);

  const runJobNow = useCallback((job: ScheduledJobRow) => {
    if (job.status === 'disabled') {
      window.alert('Enable the job before running.');
      return;
    }
    execute(job.jobId, job.jobName, job.module);
  }, [execute]);

  const manualTrigger = useCallback((jobName: string, module: string) => {
    execute('manual', jobName, module);
  }, [execute]);

  const value = useMemo(
    () => ({
      jobs,
      setJobs,
      history,
      setHistory,
      queue,
      setQueue,
      settings,
      setSettings,
      updateJob,
      setJobStatus,
      runJobNow,
      manualTrigger,
    }),
    [jobs, history, queue, settings, updateJob, setJobStatus, runJobNow, manualTrigger],
  );

  return <SchedulerContext.Provider value={value}>{children}</SchedulerContext.Provider>;
}

export function useScheduler(): SchedulerValue {
  const context = useContext(SchedulerContext);
  if (!context) throw new Error('useScheduler must be used inside SchedulerProvider');
  return context;
}
