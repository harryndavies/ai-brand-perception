import { useReducer, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAnalysisStream } from "@/hooks/use-analysis-stream";
import { listModels, createReport } from "@/services/reports";
import { createSchedule } from "@/services/schedules";
import { DEFAULT_SCHEDULE_INTERVAL_DAYS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/format";
import { analysisSchema, type AnalysisFormData } from "@/lib/schemas";
import { useAuthStore } from "@/stores/auth";
import { JobStatus } from "@/types";
import type { ModelInfo } from "@/types";

// ---------------------------------------------------------------------------
// Execution state (non-form state managed by reducer)
// ---------------------------------------------------------------------------

interface ExecutionState {
  open: boolean;
  status: JobStatus;
  errorMessage: string;
  modelStatuses: Record<string, JobStatus>;
}

const INITIAL_EXECUTION: ExecutionState = {
  open: false,
  status: JobStatus.IDLE,
  errorMessage: "",
  modelStatuses: {},
};

type ExecutionAction =
  | { type: "SET_OPEN"; open: boolean }
  | { type: "START" }
  | { type: "PROGRESS"; modelStatuses: Record<string, JobStatus>; overall: JobStatus }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

function reducer(state: ExecutionState, action: ExecutionAction): ExecutionState {
  switch (action.type) {
    case "SET_OPEN":
      return { ...state, open: action.open };
    case "START":
      return { ...state, status: JobStatus.PENDING, errorMessage: "", modelStatuses: {} };
    case "PROGRESS":
      return { ...state, status: action.overall, modelStatuses: action.modelStatuses };
    case "FAIL":
      return { ...state, status: JobStatus.FAILED, errorMessage: action.message };
    case "RESET":
      return { ...INITIAL_EXECUTION };
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Encapsulates all analysis dialog state and logic:
 * form validation (react-hook-form + zod), model selection,
 * mutation, SSE streaming, and reset.
 */
export function useAnalysisDialog() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const hasKey = user?.has_api_key ?? false;
  const userProviders = user?.api_keys ?? [];

  const [execution, dispatch] = useReducer(reducer, INITIAL_EXECUTION);
  const isRunning = execution.status !== JobStatus.IDLE;

  // -- Available models --

  const { data: availableModels } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
    staleTime: 60_000,
  });

  const userModels = useMemo(
    () => (availableModels ?? []).filter((m) => userProviders.includes(m.provider)),
    [availableModels, userProviders],
  );

  const defaultModels = useMemo(
    () => (userModels.length > 0 ? [userModels[0].key] : []),
    [userModels],
  );

  const modelsByProvider = useMemo(
    () =>
      userModels.reduce<Record<string, ModelInfo[]>>((acc, m) => {
        (acc[m.provider] ??= []).push(m);
        return acc;
      }, {}),
    [userModels],
  );

  // -- Form (react-hook-form + zod) --

  const form = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      brand: "",
      competitors: ["", "", ""],
      selectedModels: [],
      repeatMonthly: false,
    },
  });

  // Set default model selection when models load
  useEffect(() => {
    if (defaultModels.length > 0 && form.getValues("selectedModels").length === 0) {
      form.setValue("selectedModels", defaultModels);
    }
  }, [defaultModels]);

  // -- SSE stream callbacks --

  const onProgress = useCallback(
    (update: { modelStatuses: Record<string, JobStatus>; overall: JobStatus }) => {
      dispatch({ type: "PROGRESS", ...update });
    },
    [],
  );

  const onComplete = useCallback(
    (reportId: string) => {
      setTimeout(() => {
        dispatch({ type: "RESET" });
        form.reset();
        navigate(`/reports/${reportId}`);
      }, 600);
    },
    [navigate, form],
  );

  const onStreamError = useCallback(
    () => dispatch({ type: "FAIL", message: "Connection lost. Please try again." }),
    [],
  );

  const { connect, disconnect } = useAnalysisStream({
    onProgress,
    onComplete,
    onError: onStreamError,
  });

  // -- Actions --

  function reset() {
    dispatch({ type: "RESET" });
    form.reset({ brand: "", competitors: ["", "", ""], selectedModels: defaultModels, repeatMonthly: false });
    disconnect();
  }

  const mutation = useMutation({
    mutationFn: async (data: AnalysisFormData) => {
      const brand = data.brand.trim();
      const competitors = data.competitors.filter((c) => c.trim());
      const [report] = await Promise.all([
        createReport(brand, competitors, data.selectedModels),
        data.repeatMonthly
          ? createSchedule(brand, competitors, data.selectedModels, DEFAULT_SCHEDULE_INTERVAL_DAYS)
          : null,
      ]);
      return report;
    },
    onSuccess: (report) => connect(report.id),
    onError: (err) => {
      dispatch({
        type: "FAIL",
        message: getErrorMessage(err, "Something went wrong. Please try again."),
      });
    },
  });

  function handleFormSubmit(data: AnalysisFormData) {
    dispatch({ type: "START" });
    mutation.mutate(data);
  }

  function toggleModel(key: string) {
    const model = availableModels?.find((m) => m.key === key);
    if (!model) return;

    const current = form.getValues("selectedModels");
    if (current.includes(key)) {
      const next = current.filter((k) => k !== key);
      if (next.length > 0) form.setValue("selectedModels", next, { shouldValidate: true });
    } else {
      const otherProviders = current.filter((k) => {
        const m = availableModels?.find((am) => am.key === k);
        return m?.provider !== model.provider;
      });
      form.setValue("selectedModels", [...otherProviders, key], { shouldValidate: true });
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isRunning && execution.status !== JobStatus.FAILED) return;
    dispatch({ type: "SET_OPEN", open: nextOpen });
    if (!nextOpen) reset();
  }

  return {
    form,
    execution,
    isRunning,
    hasKey,
    availableModels,
    modelsByProvider,
    handleFormSubmit,
    handleOpenChange,
    toggleModel,
    reset,
  };
}
