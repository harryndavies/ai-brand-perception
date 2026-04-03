import { get, post, createEventSource } from "@/lib/api";
import type { BrandReport, ModelInfo } from "@/types";

/** Fetch all reports for the current user, newest first. */
export function listReports(): Promise<BrandReport[]> {
  return get<BrandReport[]>("reports");
}

/** Fetch a single report by ID. */
export function getReport(id: string): Promise<BrandReport> {
  return get<BrandReport>(`reports/${id}`);
}

/** Fetch the available AI models from the backend registry. */
export function listModels(): Promise<ModelInfo[]> {
  return get<ModelInfo[]>("reports/models");
}

/** Create a new analysis report for the given brand and models. */
export function createReport(brand: string, competitors: string[], models: string[]): Promise<BrandReport> {
  return post<BrandReport>("reports", { brand, competitors, models });
}

/** Open an SSE stream for real-time analysis progress updates. */
export function streamReport(id: string): EventSource {
  return createEventSource(`/reports/${id}/stream`);
}
