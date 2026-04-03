import { useRef, useEffect, useCallback } from "react";
import { streamReport } from "@/services/reports";
import { JobStatus } from "@/types";

/** SSE event names emitted by the backend streaming endpoint. */
const SSE_EVENT = {
  PROGRESS: "progress",
  COMPLETE: "complete",
  ERROR: "error",
} as const;

export interface ProgressUpdate {
  modelStatuses: Record<string, JobStatus>;
  overall: JobStatus;
}

interface UseAnalysisStreamOptions {
  onProgress: (update: ProgressUpdate) => void;
  onComplete: (reportId: string) => void;
  onError: () => void;
}

/**
 * Manages an SSE connection to stream real-time analysis progress.
 *
 * Callbacks are stored in refs so SSE event listeners always invoke
 * the latest version, avoiding stale closure issues.
 *
 * Returns a `connect` function that opens the stream for a given report ID,
 * and a `disconnect` function for manual cleanup. The stream is automatically
 * closed when the component unmounts.
 */
export function useAnalysisStream({ onProgress, onComplete, onError }: UseAnalysisStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs in sync with latest callbacks
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  // Clean up on unmount
  useEffect(() => disconnect, [disconnect]);

  const connect = useCallback(
    (reportId: string) => {
      disconnect();

      const es = streamReport(reportId);
      eventSourceRef.current = es;

      es.addEventListener(SSE_EVENT.PROGRESS, (e) => {
        const data = JSON.parse(e.data) as Record<
          string,
          { id: string; status: JobStatus; progress: number }
        >;
        const modelStatuses = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, v.status]),
        );
        const statuses = Object.values(data).map((v) => v.status);

        let overall: JobStatus;
        if (statuses.includes(JobStatus.RUNNING)) {
          overall = JobStatus.RUNNING;
        } else if (statuses.every((s) => s === JobStatus.COMPLETE)) {
          overall = JobStatus.COMPLETE;
        } else {
          overall = JobStatus.PENDING;
        }

        onProgressRef.current({ modelStatuses, overall });
      });

      es.addEventListener(SSE_EVENT.COMPLETE, () => {
        es.close();
        onCompleteRef.current(reportId);
      });

      es.addEventListener(SSE_EVENT.ERROR, () => {
        es.close();
        onErrorRef.current();
      });
    },
    [disconnect],
  );

  return { connect, disconnect };
}
