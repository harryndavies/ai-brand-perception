import type { AnalysisStatus } from "@/types";

// ---------------------------------------------------------------------------
// Report status
// ---------------------------------------------------------------------------

/** Map report status to shadcn Badge variant. */
export const STATUS_VARIANT: Record<AnalysisStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "secondary",
  complete: "default",
  failed: "destructive",
};

// ---------------------------------------------------------------------------
// Sentiment formatting (-1 to +1 scale)
// ---------------------------------------------------------------------------

/** Return a sentiment label: Positive / Neutral / Negative. */
export function sentimentLabel(score: number): string {
  if (score >= 0.5) return "Positive";
  if (score >= 0) return "Neutral";
  return "Negative";
}

/** Return a Tailwind class for sentiment colouring. */
export function sentimentColor(score: number): string {
  if (score >= 0.5) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0) return "text-muted-foreground";
  return "text-red-500";
}

/** Return a Tailwind class for compact sentiment colouring (cards, gauges). */
export function sentimentColorCompact(score: number): string {
  if (score >= 0.2) return "text-emerald-500";
  if (score >= -0.2) return "text-amber-500";
  return "text-red-500";
}

/** Format a sentiment score for display (e.g. "+0.65"). */
export function formatSentiment(score: number): string {
  return `${score > 0 ? "+" : ""}${score.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/** Format an ISO date string for display (e.g. "3 Apr 2026"). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format an ISO date string with time (e.g. "3 April 2026, 14:30"). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format an ISO date string for compact chart axes (e.g. "Apr 3"). */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

/** Format an ISO date string for chart tooltips (e.g. "3 April 2026"). */
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/** Safely extract an error message from an unknown caught value. */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
