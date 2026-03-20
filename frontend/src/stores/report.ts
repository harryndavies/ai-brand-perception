import { create } from "zustand";
import type { BrandReport, AnalysisJob } from "@/types";

interface ReportState {
  currentReport: BrandReport | null;
  activeJobs: AnalysisJob[];
  setCurrentReport: (report: BrandReport | null) => void;
  setActiveJobs: (jobs: AnalysisJob[]) => void;
  updateJob: (id: string, updates: Partial<AnalysisJob>) => void;
}

export const useReportStore = create<ReportState>((set) => ({
  currentReport: null,
  activeJobs: [],
  setCurrentReport: (report) => set({ currentReport: report }),
  setActiveJobs: (jobs) => set({ activeJobs: jobs }),
  updateJob: (id, updates) =>
    set((state) => ({
      activeJobs: state.activeJobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job
      ),
    })),
}));
